import ctypes
import sys
from pathlib import Path

from PySide6.QtCore import QPointF, QTimer, Qt, QUrl
from PySide6.QtGui import QCursor
from PySide6.QtWidgets import (
    QApplication,
    QLineEdit,
    QMainWindow,
    QPushButton,
    QTabWidget,
    QToolBar,
)
from PySide6.QtWebEngineCore import (
    QWebEnginePage,
    QWebEngineProfile,
    QWebEngineScript,
)
from PySide6.QtWebEngineWidgets import QWebEngineView


# ---------------------------------------------------------
# Direct CGWarp bypassing Qt's broken QCursor.setPos
# ---------------------------------------------------------

class _CGPoint(ctypes.Structure):
    _fields_ = [("x", ctypes.c_double), ("y", ctypes.c_double)]


_core = ctypes.cdll.LoadLibrary(
    "/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics"
)
_core.CGWarpMouseCursorPosition.restype = ctypes.c_int
_core.CGWarpMouseCursorPosition.argtypes = [_CGPoint]


def _cg_warp(x, y):
    _core.CGWarpMouseCursorPosition(_CGPoint(float(x), float(y)))


APP_NAME = "Python Browser"

HOME_PAGE = "https://duckduckgo.com"
SEARCH_ENGINE = "https://duckduckgo.com/?q="
TRANSLATE_URL = "https://translate.google.com/?sl=en&tl=ja&op=translate"
CHATGPT_URL = "https://chatgpt.com/"
GITHUB_URL = "https://github.com/"
YOUTUBE_URL = "https://www.youtube.com/"
PINGHUG_URL = "https://pinghug.com"

CODE_URL = "https://jakefnrr.github.io/code"

# QtWebEngine's built-in Pointer Lock is broken (it never engages in this
# build), so games that call requestPointerLock() are emulated: injected JS
# makes the page believe pointer lock is on, and the cursor is captured on
# the Qt side. Pressing ESC releases it, exactly like a real browser.

LOCK_MARKER = "__PLQ_LOCK__"
UNLOCK_MARKER = "__PLQ_UNLOCK__"

POINTER_LOCK_JS = """
(function () {
    var px = 0, py = 0;
    var accX = 0, accY = 0;
    window.__plqTick = 0;
    window.__plqLast = [];
    window.__plqDiagOn = false;
    window.__plqDiagEl = null;

    var guardMove = function (e) {
        if (!window.__plTarget) return;
        if (e.__plqSynth) return;
        e.stopPropagation();
    };
    document.addEventListener("mousemove", guardMove, true);
    document.addEventListener("pointermove", guardMove, true);

    function fireChange() {
        try { document.dispatchEvent(new Event("pointerlockchange")); }
        catch (e) {}
    }

    function doLock(el) {
        window.__plTarget = el;
        px = 0;
        py = 0;
        accX = 0;
        accY = 0;
        fireChange();
        console.log("__PLQ_LOCK__");
    }

    function doUnlock() {
        var was = window.__plTarget;
        window.__plTarget = null;
        accX = 0;
        accY = 0;
        fireChange();
        if (was) console.log("__PLQ_UNLOCK__");
    }

    function dispatch(canonical) {
        return function (dx, dy, cx, cy) {
            if (!window.__plTarget) return;
            var proto = canonical === "pointermove" && window.PointerEvent
                ? window.PointerEvent
                : MouseEvent;
            var e = new proto(canonical, {
                bubbles: true,
                cancelable: false
            });
            try { e.__plqSynth = true; } catch (err) {}
            try {
                Object.defineProperty(e, "movementX", { value: dx });
                Object.defineProperty(e, "movementY", { value: dy });
                Object.defineProperty(e, "clientX", { value: cx });
                Object.defineProperty(e, "clientY", { value: cy });
                Object.defineProperty(e, "screenX", { value: 0 });
                Object.defineProperty(e, "screenY", { value: 0 });
            } catch (err) {}
            var target = window.__plTarget;
            try { target.dispatchEvent(e); } catch (err) {}
        };
    }

    window.__plqFlush = function (dx, dy) {
        if (!window.__plTarget) return;
        if (dx === 0 && dy === 0) return;
        accX += dx;
        accY += dy;
        px += accX;
        py += accY;
        var t = window.__plTarget;
        var left = 0, top = 0;
        if (typeof t.getBoundingClientRect === "function") {
            var b = t.getBoundingClientRect();
            left = b.left;
            top = b.top;
        }
        var fx = left + px;
        var fy = top + py;
        var fdx = accX, fdy = accY;
        accX = 0;
        accY = 0;
        window.__plqTick += 1;
        window.__plqLast.push(fdx + "x" + fdy);
        if (window.__plqLast.length > 8) {
            window.__plqLast.shift();
        }
        dispatch("pointermove")(fdx, fdy, fx, fy);
        dispatch("mousemove")(fdx, fdy, fx, fy);
    };

    if (Element.prototype) {
        try {
            Element.prototype.requestPointerLock = function () {
                doLock(this);
                return Promise.resolve();
            };
        } catch (e) {}
        try {
            Element.prototype.requestPointerLockUnadjustedMovement = function () {
                doLock(this);
                return Promise.resolve();
            };
        } catch (e) {}
    }
    if (Document.prototype) {
        try {
            Document.prototype.requestPointerLock = function () {
                doLock(document);
                return Promise.resolve();
            };
            Object.defineProperty(Document.prototype, "pointerLockElement", {
                configurable: true,
                get: function () { return window.__plTarget || null; }
            });
            Document.prototype.exitPointerLock = function () { doUnlock(); };
        } catch (e) {}
    }
    window.__plqUnlock = doUnlock;

    function diagText() {
        return (
            "PL " + (window.__plTarget ? "LOCKED" : "free")
            + " ticks=" + window.__plqTick
            + (window.__plqLast.length
                ? " last=[" + window.__plqLast.join(" ") + "]"
                : "")
        );
    }

    window.__plqDiag = function () {
        window.__plqDiagOn = !window.__plqDiagOn;
        var el = window.__plqDiagEl;
        if (!window.__plqDiagOn) {
            if (el && el.parentNode) el.parentNode.removeChild(el);
            window.__plqDiagEl = null;
            return "off";
        }
        if (!el) {
            el = document.createElement("div");
            el.style.cssText = (
                "position:fixed;top:8px;left:50%;transform:translateX(-50%);"
                + "z-index:2147483647;background:rgba(0,0,0,.8);"
                + "color:#3f6;font:12px/1.7 ui-monospace,monospace;"
                + "padding:6px 14px;border-radius:8px;pointer-events:none;"
                + "white-space:pre;"
            );
            document.documentElement.appendChild(el);
            window.__plqDiagEl = el;
        }
        el.textContent = diagText();
        return "on";
    };

    setInterval(function () {
        var el = window.__plqDiagEl;
        if (el && window.__plqDiagOn) el.textContent = diagText();
    }, 300);
})();
"""


# ---------------------------------------------------------
# Clipboard shim: QtWebEngine's async Clipboard API is broken
# (writeText requires a trusted user gesture + permission that
# is never surfaced), so route copies through execCommand,
# which Chromium performs synchronously with a hidden textarea.
# ---------------------------------------------------------

CLIPBOARD_SHIM_JS = """
(function () {
    if (!window.navigator.clipboard) return;
    var box = null;
    function el() {
        if (!box) {
            box = document.createElement("textarea");
            box.setAttribute("readonly", "");
            box.style.cssText = (
                "position:fixed;top:-9999px;left:-9999px;" +
                "opacity:0;width:1px;height:1px;"
            );
            document.body.appendChild(box);
        }
        return box;
    }
    var written = "";
    function writeSync(text) {
        written = text;
        var b = el();
        b.value = text;
        b.focus();
        b.select();
        b.setSelectionRange(0, b.value.length);
        var ok = document.execCommand("copy");
        b.blur();
        return ok;
    }
    window.navigator.clipboard.writeText = function (text) {
        writeSync(text);
        return Promise.resolve();
    };
    window.navigator.clipboard.readText = function () {
        return Promise.resolve(written);
    };
    var origExec = document.execCommand.bind(document);
    document.execCommand = function () {
        var args = Array.prototype.slice.call(arguments);
        if (args[0] === "copy") {
            var sel = window.getSelection();
            var s = "";
            if (sel && sel.toString && sel.toString()) {
                s = sel.toString();
            } else if (document.activeElement) {
                var a = document.activeElement;
                s = (a.value !== undefined ? a.value : a.textContent) || "";
            }
            if (s) {
                written = s;
                var b = el();
                b.value = s;
                b.focus();
                b.select();
                var ok = origExec.apply(document, args);
                b.blur();
                return ok;
            }
        }
        return origExec.apply(document, args);
    };
})();
"""


# ---------------------------------------------------------
# Persistent browser storage
# ---------------------------------------------------------

DATA_DIR = Path.home() / ".python_browser"
PROFILE_DIR = DATA_DIR / "profile"
CACHE_DIR = DATA_DIR / "cache"

PROFILE_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------
# Browser page
# ---------------------------------------------------------

class BrowserPage(QWebEnginePage):

    def __init__(self, profile, parent=None):
        super().__init__(profile, parent)

        script = QWebEngineScript()
        script.setName("browser-pointer-lock")
        script.setInjectionPoint(QWebEngineScript.DocumentCreation)
        script.setWorldId(QWebEngineScript.MainWorld)
        script.setRunsOnSubFrames(True)
        script.setSourceCode(POINTER_LOCK_JS)
        self.scripts().insert(script)

        clip_script = QWebEngineScript()
        clip_script.setName("browser-clipboard-shim")
        clip_script.setInjectionPoint(
            QWebEngineScript.DocumentCreation
        )
        clip_script.setWorldId(QWebEngineScript.MainWorld)
        clip_script.setRunsOnSubFrames(True)
        clip_script.setSourceCode(CLIPBOARD_SHIM_JS)
        self.scripts().insert(clip_script)

    def featurePermissionRequested(self, url, feature):

        if feature in (
            QWebEnginePage.Feature.MouseLock,
            QWebEnginePage.Feature.ClipboardReadWrite,
        ):
            self.setFeaturePermission(
                url,
                feature,
                QWebEnginePage.PermissionGrantedByUser,
            )
            QTimer.singleShot(0, self._focus_web_view)
            return

        super().featurePermissionRequested(url, feature)

    def javaScriptConsoleMessage(self, level, message, line, source):

        if message.startswith(LOCK_MARKER):

            view = self.parent()

            if view is not None:
                view.engage_pointer_capture()

        elif message.startswith(UNLOCK_MARKER):

            view = self.parent()

            if view is not None:
                view.release_pointer_capture(
                    fire_js=False
                )

        super().javaScriptConsoleMessage(
            level, message, line, source
        )

    def _focus_web_view(self):

        view = self.parent()

        if view is not None:
            view.setFocus()


# ---------------------------------------------------------
# Browser tab
# ---------------------------------------------------------

class BrowserTab(QWebEngineView):

    def __init__(self, profile):
        super().__init__()

        page = BrowserPage(profile, self)
        self.setPage(page)

        self._capture_active = False
        self._pl_last = QPointF()

        self._pl_tick = QTimer(self)
        self._pl_tick.setInterval(4)
        self._pl_tick.timeout.connect(self._pl_sample)

        self.setFocusPolicy(Qt.StrongFocus)

    # -------------------------------------------------
    # Pointer lock emulation
    # -------------------------------------------------

    def _center_global(self):

        return self.mapToGlobal(self.rect().center())

    def engage_pointer_capture(self):

        if self._capture_active:
            return

        self._capture_active = True
        self.setFocus()
        QApplication.setOverrideCursor(Qt.BlankCursor)

        self._pl_last = QCursor.pos()

        self._pl_tick.start()

    def release_pointer_capture(self, fire_js=True):

        if not self._capture_active:
            return

        self._capture_active = False
        self._pl_tick.stop()
        QApplication.restoreOverrideCursor()

        # Make sure the cursor is visible again: clear any widget-level
        # cursor Qt may have left set, and warp the OS cursor back over the
        # view center where the player expects the pointer after ESC.
        self.unsetCursor()
        center = self._center_global()
        _cg_warp(center.x(), center.y())

        if fire_js:

            page = self.page()

            if page is not None:
                page.runJavaScript(
                    "window.__plqUnlock ? window.__plqUnlock() : true",
                    QWebEngineScript.MainWorld,
                )

    def _pl_sample(self):

        if not self._capture_active:
            return

        pos = QCursor.pos()

        dx = pos.x() - self._pl_last.x()
        dy = pos.y() - self._pl_last.y()

        center = self._center_global()
        _cg_warp(center.x(), center.y())
        self._pl_last = QPointF(center.x(), center.y())

        if dx == 0 and dy == 0:
            return

        page = self.page()

        if page is not None:
            js = (
                "window.__plqFlush ? __plqFlush("
                + str(dx) + "," + str(dy)
                + ") : true"
            )
            page.runJavaScript(
                js,
                QWebEngineScript.MainWorld,
            )

    def focusOutEvent(self, event):

        if self._capture_active:
            self.release_pointer_capture(fire_js=True)

        super().focusOutEvent(event)

    def keyPressEvent(self, event):

        if (
            self._capture_active
            and event.key() == Qt.Key_Escape
        ):
            self.release_pointer_capture(fire_js=True)
            super().keyPressEvent(event)
            event.accept()
            return

        if event.key() == Qt.Key_F1:

            page = self.page()

            if page is not None:
                page.runJavaScript(
                    "window.__plqDiag ? __plqDiag() : 'no diag'",
                    QWebEngineScript.MainWorld,
                )

            event.accept()
            return

        super().keyPressEvent(event)


# ---------------------------------------------------------
# Main browser
# ---------------------------------------------------------

class Browser(QMainWindow):

    def __init__(self):
        super().__init__()

        self.setWindowTitle(APP_NAME)
        self.resize(1400, 900)

        # -------------------------------------------------
        # Persistent Chromium profile
        # -------------------------------------------------

        self.profile = QWebEngineProfile(
            "PythonBrowserProfile",
            self
        )

        self.profile.setPersistentStoragePath(
            str(PROFILE_DIR)
        )

        self.profile.setCachePath(
            str(CACHE_DIR)
        )

        self.profile.setPersistentCookiesPolicy(
            QWebEngineProfile.ForcePersistentCookies
        )

        # Tell websites that English is preferred.
        self.profile.setHttpAcceptLanguage(
            "en-US,en;q=0.9"
        )

        # -------------------------------------------------
        # Tabs
        # -------------------------------------------------

        self.tabs = QTabWidget()
        self.tabs.setTabsClosable(True)
        self.tabs.setMovable(True)

        self.is_fullscreen = False

        self._dev_tools = None

        self.tabs.tabCloseRequested.connect(
            self.close_tab
        )

        self.tabs.currentChanged.connect(
            self.current_tab_changed
        )

        self.setCentralWidget(self.tabs)

        # -------------------------------------------------
        # Toolbar
        # -------------------------------------------------

        toolbar = QToolBar()
        toolbar.setMovable(False)
        toolbar.setStyleSheet(
            "QPushButton { padding: 2px 4px; font-size: 12px; }"
        )
        self.addToolBar(toolbar)

        def compact(button):
            button.setFixedSize(28, 26)
            return button

        back_button = compact(QPushButton("←"))
        back_button.clicked.connect(self.go_back)
        toolbar.addWidget(back_button)

        forward_button = compact(QPushButton("→"))
        forward_button.clicked.connect(self.go_forward)
        toolbar.addWidget(forward_button)

        reload_button = compact(QPushButton("⟳"))
        reload_button.clicked.connect(self.reload_page)
        toolbar.addWidget(reload_button)

        home_button = compact(QPushButton("⌂"))
        home_button.clicked.connect(self.go_home)
        toolbar.addWidget(home_button)

        translate_button = compact(QPushButton("T"))
        translate_button.setToolTip("Google Translate (EN → JA)")
        translate_button.clicked.connect(self.open_translate)
        toolbar.addWidget(translate_button)

        inspect_button = compact(QPushButton("I"))
        inspect_button.setToolTip("Inspect Element")
        inspect_button.clicked.connect(self.open_inspect)
        toolbar.addWidget(inspect_button)

        chatgpt_button = compact(QPushButton("C"))
        chatgpt_button.setToolTip("Open ChatGPT")
        chatgpt_button.clicked.connect(self.open_chatgpt)
        toolbar.addWidget(chatgpt_button)

        github_button = compact(QPushButton("G"))
        github_button.setToolTip("Open GitHub")
        github_button.clicked.connect(self.open_github)
        toolbar.addWidget(github_button)

        youtube_button = compact(QPushButton("Y"))
        youtube_button.setToolTip("Open YouTube")
        youtube_button.clicked.connect(self.open_youtube)
        toolbar.addWidget(youtube_button)

        pinghug_button = compact(QPushButton("P"))
        pinghug_button.setToolTip("Open Ping Hug")
        pinghug_button.clicked.connect(self.open_pinghug)
        toolbar.addWidget(pinghug_button)

        fullscreen_button = compact(QPushButton("⛶"))
        fullscreen_button.setToolTip("Toggle Fullscreen")
        fullscreen_button.clicked.connect(self.toggle_fullscreen)
        toolbar.addWidget(fullscreen_button)

        games_button = compact(QPushButton("🎮"))
        games_button.setToolTip("Open Games")
        games_button.clicked.connect(self.open_games)
        toolbar.addWidget(games_button)

        self.address = QLineEdit()
        self.address.setPlaceholderText(
            "Search or enter website address"
        )
        self.address.returnPressed.connect(self.navigate)
        toolbar.addWidget(self.address)

        new_tab_button = compact(QPushButton("+"))
        new_tab_button.clicked.connect(self.new_tab)
        toolbar.addWidget(new_tab_button)

        # -------------------------------------------------
        # First tab
        # -------------------------------------------------

        self.new_tab(HOME_PAGE)

    # -----------------------------------------------------
    # Current browser
    # -----------------------------------------------------

    def current_browser(self):
        return self.tabs.currentWidget()

    # -----------------------------------------------------
    # New tab
    # -----------------------------------------------------

    def new_tab(self, url=HOME_PAGE):

        browser = BrowserTab(self.profile)

        index = self.tabs.addTab(
            browser,
            "New Tab"
        )

        self.tabs.setCurrentIndex(index)

        browser.urlChanged.connect(
            lambda qurl, b=browser:
            self.update_url(b, qurl)
        )

        browser.page().fullScreenRequested.connect(
            lambda request, b=browser:
            self.handle_fullscreen(b, request)
        )

        browser.titleChanged.connect(
            lambda title, b=browser:
            self.update_title(b, title)
        )

        browser.iconChanged.connect(
            lambda icon, b=browser:
            self.update_icon(b, icon)
        )

        browser.loadStarted.connect(
            lambda:
            self.setWindowTitle(
                "Loading... - " + APP_NAME
            )
        )

        browser.loadStarted.connect(
            browser.release_pointer_capture
        )

        browser.loadFinished.connect(
            self.page_finished
        )

        browser.setUrl(QUrl(url))

    # -----------------------------------------------------
    # Close tab
    # -----------------------------------------------------

    def close_tab(self, index):

        if self.tabs.count() == 1:
            return

        widget = self.tabs.widget(index)

        self.tabs.removeTab(index)

        widget.deleteLater()

    # -----------------------------------------------------
    # Current tab changed
    # -----------------------------------------------------

    def current_tab_changed(self, index):

        self.release_all_captures()

        if index < 0:
            return

        browser = self.current_browser()

        if browser:
            self.address.setText(
                browser.url().toString()
            )

            self.setWindowTitle(
                browser.title() or APP_NAME
            )

    def release_all_captures(self):

        for i in range(self.tabs.count()):

            widget = self.tabs.widget(i)

            if hasattr(widget, "release_pointer_capture"):
                widget.release_pointer_capture(
                    fire_js=False
                )

    # -----------------------------------------------------
    # URL changed
    # -----------------------------------------------------

    def update_url(self, browser, url):

        if browser == self.current_browser():
            self.address.setText(
                url.toString()
            )

    # -----------------------------------------------------
    # Page title
    # -----------------------------------------------------

    def update_title(self, browser, title):

        index = self.tabs.indexOf(browser)

        if index == -1:
            return

        if title:

            self.tabs.setTabText(
                index,
                title[:30]
            )

            if browser == self.current_browser():

                self.setWindowTitle(
                    title + " - " + APP_NAME
                )

        else:

            self.tabs.setTabText(
                index,
                "New Tab"
            )

    # -----------------------------------------------------
    # Favicon
    # -----------------------------------------------------

    def update_icon(self, browser, icon):

        index = self.tabs.indexOf(browser)

        if index >= 0:
            self.tabs.setTabIcon(
                index,
                icon
            )

    # -----------------------------------------------------
    # Page finished
    # -----------------------------------------------------

    def page_finished(self, success):

        browser = self.current_browser()

        if not browser:
            return

        if success:

            self.setWindowTitle(
                (browser.title() or "New Tab")
                + " - "
                + APP_NAME
            )

        else:

            self.setWindowTitle(
                "Page failed - " + APP_NAME
            )

    # -----------------------------------------------------
    # Navigate
    # -----------------------------------------------------

    def navigate(self):

        text = self.address.text().strip()

        if not text:
            return

        if text.startswith("http://"):

            url = QUrl(text)

        elif text.startswith("https://"):

            url = QUrl(text)

        elif text.startswith("localhost"):

            url = QUrl("http://" + text)

        elif "." in text and " " not in text:

            url = QUrl("https://" + text)

        else:

            encoded = (
                QUrl.toPercentEncoding(text)
                .data()
                .decode()
            )

            url = QUrl(
                SEARCH_ENGINE + encoded
            )

        self.current_browser().setUrl(url)

    # -----------------------------------------------------
    # Navigation buttons
    # -----------------------------------------------------

    def go_back(self):

        browser = self.current_browser()

        if browser:
            browser.back()

    def go_forward(self):

        browser = self.current_browser()

        if browser:
            browser.forward()

    def reload_page(self):

        browser = self.current_browser()

        if browser:
            browser.reload()

    def go_home(self):

        browser = self.current_browser()

        if browser:
            browser.setUrl(
                QUrl(HOME_PAGE)
            )

    def open_translate(self):

        self.new_tab(TRANSLATE_URL)

    def open_inspect(self):

        browser = self.current_browser()

        if not browser:
            return

        page = browser.page()

        if page is None:
            return

        if self._dev_tools is None:
            view = QWebEngineView()
            view.resize(900, 600)
            self._dev_tools = view

        page.setDevToolsPage(self._dev_tools.page())

        self._dev_tools.show()
        self._dev_tools.raise_()

    def open_chatgpt(self):

        browser = self.current_browser()

        if browser:
            browser.setUrl(QUrl(CHATGPT_URL))

    def open_github(self):

        browser = self.current_browser()

        if browser:
            browser.setUrl(QUrl(GITHUB_URL))

    def open_youtube(self):

        browser = self.current_browser()

        if browser:
            browser.setUrl(QUrl(YOUTUBE_URL))

    def open_pinghug(self):

        self.new_tab(PINGHUG_URL)

    def open_games(self):

        self.new_tab(CODE_URL)

    # -----------------------------------------------------
    # Fullscreen from embedded site buttons (e.g. YouTube)
    # -----------------------------------------------------

    def handle_fullscreen(self, browser, request):

        request.accept()

        browser.page().setFullScreenMode(
            request.toggleOn()
        )

        if request.toggleOn():
            self.showFullScreen()
        else:
            self.showNormal()

    # -----------------------------------------------------
    # Toggle fullscreen
    # -----------------------------------------------------

    def toggle_fullscreen(self):

        self.is_fullscreen = not self.is_fullscreen

        if self.is_fullscreen:
            self.showFullScreen()
        else:
            self.showNormal()


# ---------------------------------------------------------
# Start application
# ---------------------------------------------------------

if __name__ == "__main__":

    app = QApplication(sys.argv)

    app.setApplicationName(APP_NAME)

    # English UI
    app.setStyle("Fusion")

    browser = Browser()
    browser.show()

    sys.exit(app.exec())