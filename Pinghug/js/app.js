/* ==========================================================
   PINGHUG — app logic
   Accounts + chats are stored in localStorage so the whole
   thing runs offline with no backend.
   ========================================================== */

(function () {
    "use strict";

    /* ------------------------------------------------------
       STORAGE
       ------------------------------------------------------ */

    var DB_KEY = "pinghug.db.v1";
    var SESSION_KEY = "pinghug.session.v1";

    function loadDB() {
        try {
            var raw = localStorage.getItem(DB_KEY);
            if (!raw) return { users: {}, chats: {} };

            var db = JSON.parse(raw);
            if (!db.users) db.users = {};
            if (!db.chats) db.chats = {};

            return db;

        } catch (err) {
            return { users: {}, chats: {} };
        }
    }

    function saveDB() {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(db));
        } catch (err) {
            banner("Could not save — is storage full or blocked?", true);
        }
    }

    var db = loadDB();

    /* ------------------------------------------------------
       HELPERS
       ------------------------------------------------------ */

    var $ = function (id) { return document.getElementById(id); };

    function norm(value) {
        return String(value || "").trim().toLowerCase();
    }

    function pretty(value) {
        return String(value || "").trim();
    }

    function initials(name) {
        var clean = pretty(name) || "?";
        return clean.charAt(0).toUpperCase();
    }

    function nowStamp() {
        return Date.now();
    }

    function timeLabel(ts) {
        if (!ts) return "";

        var d = new Date(ts);
        var today = new Date();

        var sameDay =
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();

        if (sameDay) {
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }

        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    /* tiny non-cryptographic hash — good enough for a local demo */
    function hash(text) {
        var h = 5381;
        var str = String(text);

        for (var i = 0; i < str.length; i++) {
            h = ((h << 5) + h + str.charCodeAt(i)) | 0;
        }

        return "h" + (h >>> 0).toString(36);
    }

    var bannerTimer = null;

    function banner(message, isBad) {
        var el = $("banner");

        el.textContent = message;
        el.classList.toggle("bad", !!isBad);
        el.classList.remove("hidden");

        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(function () {
            el.classList.add("hidden");
        }, 2400);
    }

    function fail(elId, message) {
        $(elId).textContent = message;
    }

    /* ------------------------------------------------------
       STATE
       ------------------------------------------------------ */

    var currentUser = null;   // username key of the logged in user
    var activePeer = null;    // username key of the open chat
    var searchTerm = "";

    /* ------------------------------------------------------
       TINY SIMULATED FRIEND REPLIES
       ------------------------------------------------------ */

    var REPLIES = [
        "hug received 🤗",
        "ping! what's up?",
        "haha okay, tell me more",
        "on my way",
        "sounds good to me",
        "give me 5 minutes",
        "😂 that's wild",
        "yes, let's do it",
        "missed you!",
        "pinging you back 👋"
    ];

    function scheduleReply(peerKey) {

        // only one pending reply per chat
        if (db.chats[peerKey] && db.chats[peerKey].pendingReply) return;

        db.chats[peerKey].pendingReply = true;
        saveDB();

        var delay = 900 + Math.random() * 1400;

        setTimeout(function () {

            if (!db.chats[peerKey]) return;

            db.chats[peerKey].pendingReply = false;

            var text = REPLIES[Math.floor(Math.random() * REPLIES.length)];

            db.chats[peerKey].messages.push({
                from: "them",
                text: text,
                at: nowStamp()
            });

            saveDB();

            // if the user is still looking at this chat, show it
            if (currentUser && activePeer === peerKey) {

                var typing = $("typing");
                typing.classList.remove("on");

                renderThread();
                renderPeople();
            }

        }, delay);

        // typing indicator
        if (currentUser && activePeer === peerKey) {
            setTimeout(function () {
                if (activePeer === peerKey) $("typing").classList.add("on");
            }, 350);
        }
    }

    /* ------------------------------------------------------
       ACCOUNT: SIGN UP
       ------------------------------------------------------ */

    $("form-signup").addEventListener("submit", function (e) {
        e.preventDefault();

        fail("signup-error", "");

        var display = pretty($("signup-name").value);
        var user = negSafeUser($("signup-user").value);
        var pass = $("signup-pass").value;
        var pass2 = $("signup-pass2").value;

        if (display.length < 2) {
            return fail("signup-error", "Your display name needs at least 2 characters.");
        }

        if (!user) {
            return fail("signup-error", "Usernames can only use letters, numbers, _ and .");
        }

        if (user.length < 3) {
            return fail("signup-error", "Usernames need at least 3 characters.");
        }

        if (db.users[user]) {
            return fail("signup-error", "That username is already taken.");
        }

        if (pass.length < 4) {
            return fail("signup-error", "Passwords need at least 4 characters.");
        }

        if (pass !== pass2) {
            return fail("signup-error", "Those two passwords do not match.");
        }

        db.users[user] = {
            username: user,
            display: display,
            hash: hash(pass),
            joined: nowStamp()
        };

        db.chats[user] = db.chats[user] || {};

        saveDB();

        $("form-signup").reset();

        banner("Welcome to pinghug, " + display + "!");

        startSession(user, true);
    });

    function negSafeUser(value) {
        var raw = norm(value);

        if (!raw) return "";
        if (!/^[a-z0-9_.]+$/.test(raw)) return "";

        return raw;
    }

    /* ------------------------------------------------------
       ACCOUNT: LOG IN
       ------------------------------------------------------ */

    $("form-login").addEventListener("submit", function (e) {
        e.preventDefault();

        fail("login-error", "");

        var user = norm($("login-user").value);
        var pass = $("login-pass").value;

        if (!user || !pass) {
            return fail("login-error", "Enter your username and password.");
        }

        var record = db.users[user];

        if (!record) {
            return fail("login-error", "No account called \"" + user + "\" yet. Create one!");
        }

        if (record.hash !== hash(pass)) {
            return fail("login-error", "That password is not right.");
        }

        $("form-login").reset();

        banner("Welcome back, " + record.display + "!");

        startSession(user, $("login-remember").checked);
    });

    /* ------------------------------------------------------
       SESSION
       ------------------------------------------------------ */

    function startSession(user, remember) {

        currentUser = user;
        activePeer = null;

        if (remember) {
            localStorage.setItem(SESSION_KEY, user);
        } else {
            sessionStorage.setItem(SESSION_KEY, user);
            localStorage.removeItem(SESSION_KEY);
        }

        showApp();
    }

    function endSession() {

        currentUser = null;
        activePeer = null;

        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);

        $("auth-stage").classList.remove("hidden");
        $("app-stage").classList.add("hidden");

        $("btn-logout").classList.add("hidden");

        $("island-sub").textContent = "sign in to start chatting";

        banner("Signed out. See you soon!");
    }

    $("btn-logout").addEventListener("click", endSession);

    /* ------------------------------------------------------
       SCREENS
       ------------------------------------------------------ */

    function showApp() {

        $("auth-stage").classList.add("hidden");
        $("app-stage").classList.remove("hidden");

        $("btn-logout").classList.remove("hidden");

        var me = db.users[currentUser];

        $("island-sub").textContent = "signed in as " + me.display;
        $("me-name").textContent = me.display;
        $("me-avatar").textContent = initials(me.display);

        activePeer = null;
        showEmptyConvo();

        renderPeople();
    }

    function showEmptyConvo() {
        $("convo-empty").classList.remove("hidden");
        $("convo-live").classList.add("hidden");
    }

    function showLiveConvo() {
        $("convo-empty").classList.add("hidden");
        $("convo-live").classList.remove("hidden");
    }

    /* ------------------------------------------------------
       CONTACTS
       ------------------------------------------------------ */

    function myChats() {
        if (!db.chats[currentUser]) db.chats[currentUser] = {};
        return db.chats[currentUser];
    }

    function contactList() {

        var chats = myChats();

        var list = Object.keys(chats).map(function (key) {

            var chat = chats[key];

            var last = chat.messages.length
                ? chat.messages[chat.messages.length - 1]
                : null;

            return {
                key: key,
                name: chat.name,
                messages: chat.messages,
                lastText: last ? last.text : "No messages yet — say hi!",
                lastAt: last ? last.at : (chat.created || 0)
            };
        });

        // newest activity first
        list.sort(function (a, b) { return (b.lastAt || 0) - (a.lastAt || 0); });

        return list;
    }

    function renderPeople() {

        var wrap = $("people");
        var list = contactList();

        if (searchTerm) {
            list = list.filter(function (person) {
                return norm(person.name).indexOf(searchTerm) !== -1;
            });
        }

        wrap.innerHTML = "";

        if (!list.length) {
            var empty = document.createElement("div");
            empty.className = "side-empty";

            empty.textContent = searchTerm
                ? "Nobody matches \"" + searchTerm + "\"."
                : "No chats yet. Tap + NEW CHAT to pinghug someone.";

            wrap.appendChild(empty);
            return;
        }

        list.forEach(function (person) {

            var row = document.createElement("button");
            row.type = "button";
            row.className = "person" + (person.key === activePeer ? " active" : "");

            var av = document.createElement("div");
            av.className = "avatar";
            av.textContent = initials(person.name);

            var text = document.createElement("div");
            text.className = "person-text";

            var top = document.createElement("div");
            top.className = "person-top";

            var nm = document.createElement("div");
            nm.className = "person-name";
            nm.textContent = person.name;

            var tm = document.createElement("div");
            tm.className = "person-time";
            tm.textContent = timeLabel(person.lastAt);

            top.appendChild(nm);
            top.appendChild(tm);

            var prev = document.createElement("div");
            prev.className = "person-preview";
            prev.textContent = person.lastText;

            text.appendChild(top);
            text.appendChild(prev);

            row.appendChild(av);
            row.appendChild(text);

            row.addEventListener("click", function () {
                openChatWith(person.key);
            });

            wrap.appendChild(row);
        });
    }

    /* ------------------------------------------------------
       OPEN A CHAT
       ------------------------------------------------------ */

    function openChatWith(key) {

        var chats = myChats();

        if (!chats[key]) return;

        activePeer = key;

        var chat = chats[key];

        $("peer-name").textContent = chat.name;
        $("peer-avatar").textContent = initials(chat.name);
        $("peer-avatar").setAttribute("data-peer", key);

        showLiveConvo();
        renderThread();
        renderPeople();

        $("message-input").focus();
    }

    function renderThread() {

        if (!activePeer) return;

        var chat = myChats()[activePeer];
        var thread = $("thread");

        if (!chat) return;

        thread.innerHTML = "";

        if (!chat.messages.length) {
            var hint = document.createElement("div");
            hint.className = "thread-empty";
            hint.textContent = "No messages yet. Send the first hug 👇";
            thread.appendChild(hint);
            return;
        }

        chat.messages.forEach(function (msg) {

            var bubble = document.createElement("div");
            bubble.className = "msg " + (msg.from === "me" ? "me" : "them");

            bubble.appendChild(document.createTextNode(msg.text));

            var stamp = document.createElement("span");
            stamp.className = "msg-time";
            stamp.textContent = timeLabel(msg.at);

            bubble.appendChild(stamp);
            thread.appendChild(bubble);
        });

        // keep pinned to the bottom
        thread.scrollTop = thread.scrollHeight;
    }

    /* ------------------------------------------------------
       SEND A MESSAGE
       ------------------------------------------------------ */

    $("composer").addEventListener("submit", function (e) {
        e.preventDefault();

        if (!activePeer) return;

        var input = $("message-input");
        var text = pretty(input.value);

        if (!text) return;

        var chat = myChats()[activePeer];

        chat.messages.push({
            from: "me",
            text: text,
            at: nowStamp()
        });

        saveDB();

        input.value = "";

        renderThread();
        renderPeople();

        scheduleReply(activePeer);
    });

    /* ------------------------------------------------------
       NEW CHAT
       ------------------------------------------------------ */

    var modal = $("modal");

    $("btn-new").addEventListener("click", function () {
        fail("new-error", "");
        $("new-name").value = "";
        modal.classList.remove("hidden");
        $("new-name").focus();
    });

    $("new-cancel").addEventListener("click", function () {
        modal.classList.add("hidden");
    });

    modal.addEventListener("click", function (e) {
        if (e.target === modal) modal.classList.add("hidden");
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") modal.classList.add("hidden");
    });

    $("new-create").addEventListener("click", createChat);
    $("new-name").addEventListener("keydown", function (e) {
        if (e.key === "Enter") createChat();
    });

    function createChat() {

        fail("new-error", "");

        var name = pretty($("new-name").value);

        if (name.length < 2) {
            return fail("new-error", "Give them a name with at least 2 characters.");
        }

        var chats = myChats();

        // reuse an existing chat if the name matches
        var existing = Object.keys(chats).filter(function (k) {
            return norm(chats[k].name) === norm(name);
        })[0];

        if (existing) {
            modal.classList.add("hidden");
            openChatWith(existing);
            banner("You already have a chat with " + name);
            return;
        }

        // stable, readable key
        var base = norm(name).replace(/[^a-z0-9_.]/g, "");
        if (!base) base = "friend";

        var key = base;
        var n = 2;
        while (chats[key]) {
            key = base + n;
            n++;
        }

        chats[key] = {
            name: name,
            created: nowStamp(),
            pendingReply: false,
            messages: [
                {
                    from: "them",
                    text: "Hey! 👋",
                    at: nowStamp()
                }
            ]
        };

        saveDB();

        $("new-name").value = "";
        modal.classList.add("hidden");

        renderPeople();
        openChatWith(key);

        banner("Chat started with " + name);
    }

    /* ------------------------------------------------------
       SEARCH
       ------------------------------------------------------ */

    $("search").addEventListener("input", function () {
        searchTerm = norm(this.value);
        renderPeople();
    });

    /* ------------------------------------------------------
       AUTH TAB SWITCHER
       ------------------------------------------------------ */

    document.querySelectorAll(".switch-btn").forEach(function (btn) {

        btn.addEventListener("click", function () {

            var which = this.getAttribute("data-auth");

            document.querySelectorAll(".switch-btn").forEach(function (b) {
                b.classList.remove("active");
            });

            document.querySelectorAll(".auth-form").forEach(function (f) {
                f.classList.remove("active");
            });

            this.classList.add("active");
            $("form-" + which).classList.add("active");

            fail("login-error", "");
            fail("signup-error", "");
        });
    });

    /* ------------------------------------------------------
       ISLAND: PING
       ------------------------------------------------------ */

    $("btn-echo").addEventListener("click", function () {

        var ms = (8 + Math.random() * 40).toFixed(1);
        banner("pong · local · " + ms + " ms");
    });

    /* ------------------------------------------------------
       BOOT — restore a previous session if there is one
       ------------------------------------------------------ */

    var saved = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);

    if (saved && db.users[saved]) {
        currentUser = saved;
        showApp();
    }

})();
