import asyncio
import base64
import hashlib
import json
import re
import secrets
import struct
import uuid
import time
from pathlib import Path

DIR = Path(__file__).resolve().parent
PORT = 8123
DB_PATH = DIR / "greenchat_db.json"
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
HTML_PATH = DIR / "GreenChat.html"
MAX_MSG = 4000


def now():
    return int(time.time() * 1000)


def load_db():
    if DB_PATH.exists():
        try:
            return json.loads(DB_PATH.read_text("utf-8"))
        except Exception:
            pass
    return {"users": {}, "sessions": {}, "notifications": {}, "chats": {}, "lists": {}}


db = load_db()


def dirty():
    tmp = DB_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(db, ensure_ascii=False), encoding="utf-8")
    tmp.replace(DB_PATH)


conns = {}

PBKDF2_ITERS = 200000
_attempts = {}


def password_entry(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERS).hex()
    return {"salt": salt, "hash": digest}


def check_password(stored, password):
    try:
        if isinstance(stored, dict):
            salt = stored.get("salt", "")
            digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERS).hex()
            return secrets.compare_digest(digest, stored.get("hash", ""))
        return secrets.compare_digest(str(stored or ""), password)
    except Exception:
        return False


def rate_limited(ip):
    cutoff = time.time() - 120
    fresh = {}
    for k, v in list(_attempts.items()):
        kept = [t for t in v if t > cutoff]
        if kept:
            fresh[k] = kept
    _attempts.clear()
    _attempts.update(fresh)
    recent = [t for t in _attempts.get(ip, []) if t > cutoff]
    if len(recent) >= 15:
        return True
    recent.append(time.time())
    _attempts[ip] = recent
    return False


def build_frame(opcode, payload=b""):
    out = bytearray()
    out.append(0x80 | opcode)
    ln = len(payload)
    if ln < 126:
        out.append(ln)
    elif ln < 65536:
        out.append(126)
        out += struct.pack(">H", ln)
    else:
        out.append(127)
        out += struct.pack(">Q", ln)
    out += payload
    return bytes(out)


async def read_exact(reader, n):
    data = b""
    while len(data) < n:
        chunk = await reader.read(n - len(data))
        if not chunk:
            raise ConnectionResetError
        data += chunk
    return data


async def read_frame(reader):
    head = await read_exact(reader, 2)
    b0, b1 = head[0], head[1]
    opcode = b0 & 0x0F
    masked = b1 & 0x80
    ln = b1 & 0x7F
    if ln == 126:
        ln = struct.unpack(">H", await read_exact(reader, 2))[0]
    elif ln == 127:
        ln = struct.unpack(">Q", await read_exact(reader, 8))[0]
    mask = b""
    if masked:
        mask = await read_exact(reader, 4)
    payload = await read_exact(reader, ln) if ln else b""
    if masked and ln:
        payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    return b0 & 0x80, opcode, payload


async def send(ws, obj):
    try:
        ws.writer.write(build_frame(0x1, json.dumps(obj, ensure_ascii=False).encode("utf-8")))
        await ws.writer.drain()
    except Exception:
        pass


def user_sockets(name):
    return conns.get(name, set())


async def push_to(name, obj):
    for ws in list(user_sockets(name)):
        await send(ws, obj)


def core_users(key):
    if key.startswith("g__"):
        lst = db["lists"].get(key[3:])
        return list(lst["members"]) if lst else []
    parts = key.split("__")
    return [p for p in parts if p]


def is_online(name):
    return bool(user_sockets(name))


def chat_contains(key, user):
    if key.startswith("g__"):
        lst = db["lists"].get(key[3:])
        return bool(lst and user in lst["members"])
    return user in key.split("__")


async def broadcast_chat(key, obj):
    seen = set()
    for u in core_users(key):
        if u in seen:
            continue
        seen.add(u)
        await push_to(u, obj)


async def broadcast_presence(name, online):
    me = db["users"].get(name)
    if not me:
        return
    for f in me.get("friends", []):
        await push_to(f, {"t": "presence", "name": name, "online": online})


def notify(user, n):
    db.setdefault("notifications", {}).setdefault(user, []).append(n)


def my_lists(user):
    return [l for l in db.get("lists", {}).values() if user in l.get("members", [])]


def build_state(user):
    users = {}
    for u, uu in db["users"].items():
        users[u] = {"name": uu["name"], "code": uu["friendCode"], "online": is_online(u)}
    friends = {}
    for f in db["users"][user].get("friends", []):
        friends[f] = is_online(f)
    chats = {}
    for k, msgs in db.get("chats", {}).items():
        if chat_contains(k, user):
            chats[k] = msgs[-400:]
    notifs = sorted(db.get("notifications", {}).get(user, []), key=lambda n: n.get("time", 0))
    notifs.reverse()
    return {
        "t": "state",
        "me": user,
        "users": users,
        "friends": friends,
        "incoming": db["users"][user].get("incoming", []),
        "outgoing": db["users"][user].get("outgoing", []),
        "notifications": notifs,
        "lists": [{"uid": l["uid"], "name": l["name"], "owner": l["owner"], "members": list(l["members"])} for l in my_lists(user)],
        "chats": chats,
    }


def make_code():
    while True:
        c = str(secrets.randbelow(900) + 100)
        if not any(u.get("friendCode") == c for u in db["users"].values()):
            return c


def resolve_target(name_or_code):
    name_or_code = (name_or_code or "").strip().lower()
    if not name_or_code:
        return None
    if name_or_code.isdigit() and len(name_or_code) == 3:
        for u, uu in db["users"].items():
            if uu.get("friendCode") == name_or_code:
                return u
    return name_or_code if name_or_code in db["users"] else None


async def send_lists_to(user):
    await push_to(user, {"t": "lists", "lists": [{"uid": l["uid"], "name": l["name"], "owner": l["owner"], "members": list(l["members"])} for l in my_lists(user)]})


async def on_message(ws, text):
    try:
        m = json.loads(text)
    except Exception:
        return
    t = m.get("t")
    user = ws.user

    if t == "signup":
        if rate_limited(ws.ip):
            return await send(ws, {"t": "err", "msg": "Too many attempts. Try again in a couple of minutes."})
        name = (m.get("name") or "").strip()
        password = m.get("password") or ""
        if len(name) < 2:
            return await send(ws, {"t": "err", "msg": "Name must be at least 2 characters."})
        if not re.fullmatch(r"[A-Za-z0-9 _.\\-]{2,24}", name):
            return await send(ws, {"t": "err", "msg": "Use letters, numbers, spaces, '.', '_', '-'."})
        if len(password) < 3:
            return await send(ws, {"t": "err", "msg": "Password must be at least 3 characters."})
        key = name.lower()
        if key in db["users"]:
            return await send(ws, {"t": "err", "msg": "That name is already taken."})
        db["users"][key] = {"name": name, "password": password_entry(password), "friendCode": make_code(), "friends": [], "incoming": [], "outgoing": [], "created": now()}
        db.setdefault("notifications", {})[key] = []
        dirty()
        return await login_ws(ws, key)

    if t == "login":
        if rate_limited(ws.ip):
            return await send(ws, {"t": "err", "msg": "Too many attempts. Try again in a couple of minutes."})
        key = (m.get("name") or "").strip().lower()
        u = db["users"].get(key)
        attempt = m.get("password") or ""
        if not u or not check_password(u.get("password"), attempt):
            return await send(ws, {"t": "err", "msg": "Wrong name or password."})
        if not isinstance(u.get("password"), dict):
            u["password"] = password_entry(attempt)
            dirty()
        return await login_ws(ws, key)

    if t == "resume":
        tok = m.get("token")
        key = db.get("sessions", {}).get(tok)
        if key and key in db["users"]:
            return await login_ws(ws, key, tok)
        return await send(ws, {"t": "err", "msg": "Session expired. Sign in again."})

    if t == "logout":
        if user:
            for tok, k in list(db.get("sessions", {}).items()):
                if k == user and tok == m.get("token"):
                    del db["sessions"][tok]
            dirty()
        return

    if not user:
        return await send(ws, {"t": "err", "msg": "Not signed in."})

    if t == "friend_req":
        target = resolve_target(m.get("to"))
        me = db["users"][user]
        if not target or target == user:
            return await send(ws, {"t": "err", "msg": "No such user."})
        tu = db["users"][target]
        if target in me.get("friends", []):
            return await send(ws, {"t": "err", "msg": "Already friends."})
        if target in me.get("outgoing", []):
            return await send(ws, {"t": "err", "msg": "Request already sent."})
        me.setdefault("outgoing", []).append(target)
        tu.setdefault("incoming", []).append(user)
        n = {"id": str(uuid.uuid4()), "type": "friend_request", "from": user, "text": me["name"] + " sent you a friend request.", "time": now(), "read": False}
        notify(target, n)
        dirty()
        await push_to(target, {"t": "friend_req", "from": user, "nid": n["id"], "text": n["text"]})
        await send(ws, {"t": "friend_sent", "to": target})
        await push_to(target, {"t": "state_users", "users": build_state(target)["users"]})

    if t == "friend_accept" or t == "friend_decline":
        other = m.get("from")
        me = db["users"][user]
        if other not in me.get("incoming", []):
            return
        me["incoming"].remove(other)
        db["users"][other]["outgoing"].remove(user)
        if t == "friend_decline":
            db["notifications"].get(user, [])[:] = [n for n in db["notifications"].get(user, []) if not (n.get("type") == "friend_request" and n.get("from") == other)]
            dirty()
            return await send(ws, {"t": "friend_note", "text": "Request declined."})
        if other not in me.get("friends", []):
            me.setdefault("friends", []).append(other)
        if user not in db["users"][other].get("friends", []):
            db["users"][other].setdefault("friends", []).append(user)
        db["notifications"].get(user, [])[:] = [n for n in db["notifications"].get(user, []) if not (n.get("type") == "friend_request" and n.get("from") == other)]
        n = {"id": str(uuid.uuid4()), "type": "friend_accepted", "from": user, "text": me["name"] + " accepted your friend request.", "time": now(), "read": False}
        notify(other, n)
        dirty()
        await push_to(other, {"t": "friend_accepted", "from": user, "nid": n["id"]})
        await push_to(user, {"t": "friend_added", "name": other, "online": is_online(other)})
        await push_to(other, {"t": "friend_added", "name": user, "online": is_online(user)})
        await broadcast_presence(user, True)
        await broadcast_presence(other, True)

    if t == "friend_remove":
        other = m.get("name")
        me = db["users"][user]
        if other not in me.get("friends", []):
            return
        me["friends"].remove(other)
        db["users"][other]["friends"].remove(user)
        dirty()
        await push_to(other, {"t": "friend_removed", "name": user})
        await send(ws, {"t": "friend_note", "text": "Friend removed."})

    if t == "list_create":
        name = (m.get("name") or "").strip()
        if not name:
            return await send(ws, {"t": "err", "msg": "Enter a list name."})
        uid = str(uuid.uuid4())
        db.setdefault("lists", {})[uid] = {"uid": uid, "name": name, "owner": user, "members": [user]}
        dirty()
        await send_lists_to(user)
        for to in m.get("members", []):
            if to in db["users"] and to != user:
                n = {"id": str(uuid.uuid4()), "type": "list_invite", "from": user, "listId": uid, "text": db["users"][user]["name"] + " invited you to a list: " + name, "time": now(), "read": False}
                notify(to, n)
                dirty()
                await push_to(to, {"t": "list_invite", "nid": n["id"], "listId": uid, "text": n["text"]})

    if t == "list_invite":
        lst = db["lists"].get(m.get("listId"))
        to = resolve_target(m.get("to"))
        if not lst or not to or to == user or to in lst["members"]:
            return
        if lst["owner"] != user:
            return
        n = {"id": str(uuid.uuid4()), "type": "list_invite", "from": user, "listId": lst["uid"], "text": db["users"][user]["name"] + " invited you to a list: " + lst["name"], "time": now(), "read": False}
        notify(to, n)
        dirty()
        await push_to(to, {"t": "list_invite", "nid": n["id"], "listId": lst["uid"], "text": n["text"]})

    if t == "list_accept":
        key_user = user
        uid = m.get("listId")
        lst = db["lists"].get(uid)
        if lst and key_user not in lst["members"]:
            lst["members"].append(key_user)
            dirty()
        db.setdefault("notifications", {}).setdefault(key_user, [])
        db["notifications"][key_user][:] = [n for n in db["notifications"][key_user] if not (n.get("type") == "list_invite" and n.get("listId") == uid)]
        for mem in set(lst["members"]) if lst else set():
            await send_lists_to(mem)
        dirty()

    if t == "list_decline":
        uid = m.get("listId")
        db.setdefault("notifications", {}).setdefault(user, [])
        db["notifications"][user][:] = [n for n in db["notifications"][user] if not (n.get("type") == "list_invite" and n.get("listId") == uid)]
        dirty()

    if t == "list_promote":
        lst = db["lists"].get(m.get("listId"))
        if lst and lst["owner"] == user and m.get("name") in lst["members"]:
            lst["owner"] = m["name"]
            dirty()
            for mem in lst["members"]:
                await send_lists_to(mem)

    if t == "list_remove":
        lst = db["lists"].get(m.get("listId"))
        if lst and lst["owner"] == user and m.get("name") in lst["members"] and m["name"] != user:
            lst["members"].remove(m["name"])
            dirty()
            for mem in lst["members"]:
                await send_lists_to(mem)

    if t == "list_leave":
        lst = db["lists"].get(m.get("listId"))
        if not lst or user not in lst["members"]:
            return
        lst["members"].remove(user)
        if lst["owner"] == user and lst["members"]:
            lst["owner"] = lst["members"][0]
        if not lst["members"]:
            del db["lists"][lst["uid"]]
        dirty()
        for mem in lst["members"]:
            await send_lists_to(mem)
        await push_to(user, {"t": "list_left", "listId": m.get("listId")})

    if t == "list_delete":
        lst = db["lists"].get(m.get("listId"))
        if not lst or lst["owner"] != user:
            return
        members = list(lst["members"])
        del db["lists"][lst["uid"]]
        db["chats"].pop("g__" + lst["uid"], None)
        dirty()
        for mem in members:
            await send_lists_to(mem)
            await push_to(mem, {"t": "list_left", "listId": lst["uid"]})

    if t == "delete_account":
        u = db["users"].get(user)
        if not u or not check_password(u.get("password"), (m.get("password") or "")):
            return await send(ws, {"t": "err", "msg": "Wrong password."})
        old_friends = list(u.get("friends", []))
        for k, v in list(db["users"].items()):
            if k == user:
                continue
            v["friends"] = [f for f in v.get("friends", []) if f != user]
            v["incoming"] = [f for f in v.get("incoming", []) if f != user]
            v["outgoing"] = [f for f in v.get("outgoing", []) if f != user]
        for k in [k for k in list(db.get("chats", {}).keys()) if chat_contains(k, user)]:
            db["chats"].pop(k, None)
        for lid, l in list(db.get("lists", {}).items()):
            if l.get("owner") == user:
                db["lists"].pop(lid, None)
                db["chats"].pop("g__" + lid, None)
            elif user in l.get("members", []):
                l["members"].remove(user)
        for tok, k in list(db.get("sessions", {}).items()):
            if k == user:
                db["sessions"].pop(tok, None)
        db.setdefault("notifications", {})
        db["notifications"].pop(user, None)
        for k in list(db["notifications"]):
            db["notifications"][k] = [n for n in db["notifications"][k] if n.get("from") != user]
        db["users"].pop(user, None)
        dirty()
        conns.setdefault(user, set()).discard(ws)
        await broadcast_presence(user, False)
        for f in old_friends:
            if f in db["users"]:
                await push_to(f, {"t": "friend_removed", "name": user})
        return await send(ws, {"t": "gone", "msg": "Account deleted."})

    if t == "msg":
        chat = m.get("chat")
        text = (m.get("text") or "")
        if not chat or not text.strip():
            return
        if not chat_contains(chat, user):
            return
        if len(text) > MAX_MSG:
            text = text[:MAX_MSG]
        msg = {
            "id": m.get("id") or str(uuid.uuid4()),
            "sender": user,
            "text": text,
            "time": now(),
            "readBy": [user],
            "reactions": {},
            "edited": False,
            "deleted": False,
            "forwarded": bool(m.get("forwarded")),
            "replyTo": m.get("replyTo"),
        }
        db.setdefault("chats", {}).setdefault(chat, []).append(msg)
        if len(db["chats"][chat]) > 2000:
            db["chats"][chat] = db["chats"][chat][-1500:]
        dirty()
        await broadcast_chat(chat, {"t": "msg", "chat": chat, "msg": msg})

    if t == "read":
        chat = m.get("chat")
        if chat and chat_contains(chat, user):
            participants = set(core_users(chat))
            for msg in db.get("chats", {}).get(chat, []):
                for p in participants:
                    if p not in msg.get("readBy", []):
                        msg["readBy"].append(p)
            dirty()
            await broadcast_chat(chat, {"t": "read", "chat": chat})

    if t == "react":
        chat = m.get("chat")
        if chat and chat_contains(chat, user):
            for msg in db.get("chats", {}).get(chat, []):
                if msg["id"] == m.get("msgId"):
                    reactions = msg.setdefault("reactions", {})
                    emoji = (m.get("emoji") or "❤️")
                    reactions[emoji] = reactions.get(emoji, 0) + 1
                    dirty()
                    await broadcast_chat(chat, {"t": "msg_upd", "chat": chat, "msg": msg})
                    break

    if t == "edit_msg":
        chat = m.get("chat")
        if chat and chat_contains(chat, user):
            for msg in db.get("chats", {}).get(chat, []):
                if msg["id"] == m.get("msgId") and msg["sender"] == user:
                    msg["text"] = (m.get("text") or "")[:MAX_MSG]
                    msg["edited"] = True
                    dirty()
                    await broadcast_chat(chat, {"t": "msg_upd", "chat": chat, "msg": msg})
                    break

    if t == "del_msg":
        chat = m.get("chat")
        if chat and chat_contains(chat, user):
            msgs = db.get("chats", {}).get(chat, [])
            for msg in msgs:
                if msg["id"] == m.get("msgId"):
                    if msg["sender"] == user:
                        if msg in msgs:
                            msgs.remove(msg)
                    else:
                        msg["deleted"] = True
                        msg["text"] = "[deleted message]"
                    dirty()
                    await broadcast_chat(chat, {"t": "msg_upd", "chat": chat, "msg": msg})
                    break


async def login_ws(ws, key, token=None):
    u = db["users"][key]
    if not token:
        token = secrets.token_hex(16)
    db.setdefault("sessions", {})[token] = key
    dirty()
    old = ws.user
    if old and old != key:
        conns.setdefault(old, set()).discard(ws)
    ws.user = key
    conns.setdefault(key, set()).add(ws)
    await send(ws, {"t": "session", "token": token, "me": key})
    await send(ws, build_state(key))
    await broadcast_presence(key, True)
    await push_to(key, {"t": "presence", "name": key, "online": True})


async def ws_loop(ws):
    frag_op = None
    frag = b""
    try:
        while True:
            try:
                fin, opcode, payload = await read_frame(ws.reader)
            except Exception:
                break
            if opcode == 0x8:
                try:
                    ws.writer.write(build_frame(0x8, payload[:125]))
                    await ws.writer.drain()
                except Exception:
                    pass
                break
            if opcode == 0x9:
                try:
                    ws.writer.write(build_frame(0xA, payload))
                    await ws.writer.drain()
                except Exception:
                    pass
                continue
            if opcode == 0xA:
                continue
            if opcode in (0x1, 0x2):
                if not fin:
                    if frag_op is None:
                        frag_op = opcode
                        frag = b""
                    frag += payload
                    continue
                data = payload if frag_op is None else frag + payload
                frag_op = None
                frag = b""
                if opcode == 0x1:
                    await on_message(ws, data.decode("utf-8", "replace"))
    finally:
        user = ws.user
        if user:
            conns.setdefault(user, set()).discard(ws)
            if not conns.get(user):
                await broadcast_presence(user, False)
        try:
            ws.writer.close()
        except Exception:
            pass


async def http_response(writer, status, body, ctype, extra=""):
    payload = body if isinstance(body, bytes) else body.encode("utf-8")
    writer.write(("HTTP/1.1 %s\r\nContent-Type: %s\r\nContent-Length: %d\r\nConnection: close\r\n%s\r\n" % (status, ctype, len(payload), extra)).encode("ascii"))
    writer.write(payload)
    try:
        await writer.drain()
    except Exception:
        pass


async def handle_client(reader, writer):
    try:
        head = await reader.readuntil(b"\r\n\r\n")
    except Exception:
        writer.close()
        return
    try:
        first, *rest = head.decode("iso-8859-1").split("\r\n")
        parts = first.split(" ")
        if len(parts) < 2:
            writer.close()
            return
        method, path = parts[:2]
        headers = {}
        for line in rest:
            if ":" in line:
                k, v = line.split(":", 1)
                headers[k.strip().lower()] = v.strip()
    except Exception:
        writer.close()
        return

    if path.rstrip("/") in ("/ws", "/ws/"):
        key = headers.get("sec-websocket-key", "")
        accept = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
        writer.write(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n" % accept).encode())
        await writer.drain()
        ws = type("WS", (), {})()
        ws.reader = reader
        ws.writer = writer
        ws.user = None
        try:
            ws.ip = writer.get_extra_info("peername", ("?",))[0]
        except Exception:
            ws.ip = "?"
        await ws_loop(ws)
        return

    u = path.split("?")[0]
    if u.rstrip("/") in ("", "/", "/index.html", "/GreenChat.html", "/app"):
        if HTML_PATH.exists():
            await http_response(writer, "200 OK", HTML_PATH.read_bytes(), "text/html; charset=utf-8")
        else:
            await http_response(writer, "404 Not Found", "GreenChat.html missing (run the server from its folder).", "text/plain")
    elif u == "/favicon.ico":
        await http_response(writer, "204 No Content", b"", "image/x-icon")
    else:
        await http_response(writer, "404 Not Found", "Not found", "text/plain")
    writer.close()


async def main():
    server = await asyncio.start_server(handle_client, "0.0.0.0", PORT)
    names = set()
    for s in server.sockets:
        try:
            names.add("%s:%d" % s.getsockname()[:2])
        except Exception:
            pass
    addrs = ", ".join(sorted(names))
    print("GreenChat server running on: " + addrs + " (port " + str(PORT) + ")")
    print("On this Mac open http://localhost:" + str(PORT) + ", on other devices use this Mac's IP.")
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())                                 
