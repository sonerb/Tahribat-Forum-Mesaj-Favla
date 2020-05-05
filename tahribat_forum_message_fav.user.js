// ==UserScript==
// @name         Tahribat Forum Mesaj Favla
// @namespace    http://www.tahribat.com/
// @version      0.3
// @description  Forumda beğendiğiniz mesajları favlayarak daha sonra profilinizde buna erişebilirsiniz.
// @author       pSkpt
// @match        https://*.tahribat.com/*
// @grant        none
// @updateURL    https://github.com/sonerb/Tahribat-Forum-Mesaj-Favla/raw/master/tahribat_forum_message_fav.user.js
// @downloadURL  https://github.com/sonerb/Tahribat-Forum-Mesaj-Favla/raw/master/tahribat_forum_message_fav.user.js
// @supportURL   https://www.tahribat.com/Members/pSkpt?ref=39260
// @icon         https://www.tahribat.com/favicon.ico
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/aes.js

// ==/UserScript==

(function () {
    "use strict";
    var webdb = {};
    webdb.db = null;

    function formatDate(d) {
        var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
        var month = d.getMonth() < 10 ? "0" + d.getMonth() : d.getMonth();
        var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
        var minute =
            d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();

        return (
            day + "/" + month + "/" + d.getFullYear() + " " + hour + ":" + minute
        );
    }

    let code = (function () {
        return {
            encryptMessage: function (messageToencrypt = "", secretkey = "") {
                var encryptedMessage = CryptoJS.AES.encrypt(
                    messageToencrypt,
                    secretkey
                );
                return encryptedMessage.toString();
            },
            decryptMessage: function (encryptedMessage = "", secretkey = "") {
                try{
                    var decryptedBytes = CryptoJS.AES.decrypt(encryptedMessage, secretkey);
                    var decryptedMessage = decryptedBytes.toString(CryptoJS.enc.Utf8);
                }
                catch(error)
                {
                    return false;
                }

                return decryptedMessage;
            },
        };
    })();

    String.prototype.hexEncode = function(){
        var hex, i;

        var result = "";
        for (i=0; i<this.length; i++) {
            hex = this.charCodeAt(i).toString(16);
            result += ("000"+hex).slice(-4);
        }

        return result
    }

    String.prototype.hexDecode = function(){
        var j;
        var hexes = this.match(/.{1,4}/g) || [];
        var back = "";
        for(j = 0; j<hexes.length; j++) {
            back += String.fromCharCode(parseInt(hexes[j], 16));
        }

        return back;
    }

    function delete_share() {
        return new Promise(function (resolve, reject) {
            document.querySelectorAll("table.footable-loaded:nth-of-type(2) a:not([class])").forEach(function (el, idx) {
                if (el.textContent == "Fav Backup") {
                    var mpsid = el.parentElement.parentElement.querySelector("td:nth-of-type(3) > a").dataset.mpsid;
                    var headers = [
                        {
                            token: window.notifyToken,
                        },
                    ];
                    http_get("https://www.tahribat.com/api/Core/RemoveProfileShare?MemberProfileShareId=" + mpsid, headers)
                        .then(function (data) {
                        resolve(true);
                    })
                        .catch(function (err) {
                        reject(err);
                    });
                }
            });
            resolve(true);
        });
    }


    function http_get(url, headers=null) {
        var xhr = new XMLHttpRequest();

        return new Promise(function(resolve, reject) {
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status >= 300) {
                        reject("Error, status code = " + xhr.status)
                    } else {
                        resolve(xhr.responseText);
                    }
                }
            }
            xhr.open('GET', url, true)

            if (headers != null){
                headers.forEach(function (el, idx){
                    xhr.setRequestHeader(Object.keys(el), el[Object.keys(el)]);
                });
            }

            xhr.send();
        });
    }

    function http_post(url, data)
    {
        var xhr = new XMLHttpRequest();

        return new Promise(function(resolve, reject) {
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status >= 300) {
                        reject("Error, status code = " + xhr.status)
                    } else {
                        resolve(xhr.responseText);
                    }
                }
            }
            xhr.open('POST', url, true);
            xhr.send(data);
        });
    }

    webdb.open = function () {
        var dbSize = 2 * 1024 * 1024; // 2MB
        webdb.db = openDatabase("db_post_fava", "1.0", "Favlanmis Postlar", dbSize);
    };

    webdb.createTable = function () {
        var db = webdb.db;
        db.transaction(function (tx) {
            tx.executeSql(
                "CREATE TABLE IF NOT EXISTS favlar (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, topic_title TEXT NOT NULL, username NOT NULL, msg_id INTEGER NOT NULL, url TEXT NOT NULL, url_id INTEGER NOT NULL, page INTEGER NOT NULL, added_on DATETIME);"
            );
        });
    };

    webdb.addFav = function (topic_title, username, msg_id, url, url_id, page) {
        var db = webdb.db;
        db.transaction(function (tx) {
            tx.executeSql(
                "SELECT * FROM favlar WHERE msg_id=?",
                [msg_id],
                function (tx, data) {
                    if (data.rows.length == 0) {
                        var addedOn = new Date();
                        tx.executeSql(
                            "INSERT INTO favlar(topic_title, username, msg_id, url, url_id, page, added_on) VALUES (?,?,?,?,?,?,?)",
                            [topic_title, username, msg_id, url, url_id, page, addedOn],
                            webdb.onSuccess,
                            webdb.onError
                        );
                    } else {
                        tx.executeSql(
                            "DELETE FROM favlar WHERE msg_id=?",
                            [msg_id],
                            webdb.onSuccess,
                            webdb.onError
                        );
                    }
                },
                webdb.onError
            );
        });
    };

    webdb.getPageFav = function (url_id, page, renderFunc) {
        var db = webdb.db;
        db.transaction(function (tx) {
            tx.executeSql(
                "SELECT * FROM favlar WHERE url_id=? AND page=? ORDER BY msg_id ASC",
                [url_id, page],
                renderFunc,
                webdb.onError
            );
        });
    };

    webdb.deleteFav = function (msg_id) {
        var db = webdb.db;
        db.transaction(function (tx) {
            tx.executeSql(
                "DELETE FROM favlar WHERE msg_id=?",
                [msg_id],
                webdb.onSuccess,
                webdb.onError
            );
        });
    };

    webdb.getFullFav = function (renderFunc) {
        var db = webdb.db;
        db.transaction(function (tx) {
            tx.executeSql(
                "SELECT * FROM favlar ORDER BY added_on DESC",
                [],
                renderFunc,
                webdb.onError
            );
        });
    };

    webdb.onError = function (tx, e) {
        alert("There has been an error: " + e.message);
    };

    webdb.onSuccess = function (tx, r) {
        // re-render the data.
    };

    webdb.backUpProgress = function (transaction, results) {
        var password = window.prompt("Enter Password (don't forget!):");
        if (password == null || password == "") return;
        if (password.length < 5)
        {
            alert('Password must be more than 5 characters!');
            return;
        }
        var _exportSql = "CREATE TABLE IF NOT EXISTS favlar (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, topic_title TEXT NOT NULL, username NOT NULL, msg_id INTEGER NOT NULL, url TEXT NOT NULL, url_id INTEGER NOT NULL, page INTEGER NOT NULL, added_on DATETIME);";
        if (results.rows) {
            for (var i = 0; i < results.rows.length; i++) {
                var row = results.rows.item(i);
                var _fields = [];
                var _values = [];
                for (var col in row) {
                    if (col == "id") continue;
                    _fields.push(col);
                    _values.push('"' + row[col] + '"');
                }
                _exportSql +=";\nINSERT INTO favlar(" +_fields.join(",") +") VALUES (" +_values.join(",") +")";

            }

            var b64encoded = btoa(unescape(encodeURIComponent(_exportSql)))
            var encrypted = code.encryptMessage(b64encoded, password).hexEncode();

            var parser = new DOMParser();
            var resp;
            var pm_id = 0;
            var username = document.querySelector("#topusermenu").textContent.trim();

            http_get('https://www.tahribat.com/Pm?to='+username).then(function(data){
                resp = parser.parseFromString(data, "text/html");
                var token = resp.getElementsByName('__RequestVerificationToken')[0].value;

                var formData = new FormData();
                formData.append("__RequestVerificationToken", token);
                formData.append("Username", username);
                formData.append("subject", "Favori Backup (" + formatDate(new Date()) + ")");
                formData.append("message", encrypted);
                formData.append("cmd", "NewPm");

                return http_post("https://www.tahribat.com/PM?to="+username, formData);
            }).then(function(data){
                return http_get("https://www.tahribat.com/PM?action=Inbox");
            }).then(function(data){
                resp = parser.parseFromString(data, "text/html");
                var msgs = resp.querySelectorAll("table#InboxTable tr");
                for (var i = 1; i < msgs.length; i++)
                {
                    var msg = msgs[i];
                    var link = msg.querySelector("td > a");
                    if (link.textContent.trim().substr(0, 13) == "Favori Backup")
                    {
                        pm_id = link.href.split("=")[1].trim();
                        break;
                    }
                }
                return http_get("https://www.tahribat.com/Pm?pmid=" + pm_id);
            }).then(function(data){
                return delete_share();
            }).then(function(data){
                var pm_id_enc = code.encryptMessage(pm_id, password);

                var formData = new FormData();
                formData.append("__RequestVerificationToken", document.querySelector("input[name=__RequestVerificationToken]").value);
                formData.append("action", "profileshare");
                formData.append("pstitle", "Fav Backup");
                formData.append("psurl", document.location);
                formData.append("pstxt", pm_id_enc);
                formData.append("Paylaş", "Paylaş");

                return http_post(document.location, formData);
            }).then(function(data){
                document.location.reload();
            }).catch(function(err){
                console.log(err);
            });
        }
    }

    webdb.backUp = function () {
        var db = webdb.db;
        db.transaction(function (tx) {
            tx.executeSql("SELECT * FROM favlar", [], webdb.backUpProgress, webdb.onError);
        });
    };

    webdb.resetTable = function (){
        var sql = "CREATE TABLE IF NOT EXISTS favlar (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, topic_title TEXT NOT NULL, username NOT NULL, msg_id INTEGER NOT NULL, url TEXT NOT NULL, url_id INTEGER NOT NULL, page INTEGER NOT NULL, added_on DATETIME);";
        var db = webdb.db;
        db.transaction(function (tx) {
            tx.executeSql("DROP TABLE favlar", [], webdb.onSuccess, webdb.onError);
            tx.executeSql(sql, [], webdb.onSuccess, webdb.onError);
        });
    }

    webdb.import = function(sql_cmds)
    {
        var db = webdb.db;
        db.transaction(function (tx) {
            tx.executeSql("DROP TABLE favlar", [], webdb.onSuccess, webdb.onError);

            sql_cmds.forEach(function(cmd, idx){
                tx.executeSql(cmd, [], webdb.onSuccess, webdb.onError);
            });

        });
    }

    if (document.location.pathname.indexOf("/forum/") > -1) {
        var url_bol = document.location.pathname.split("/");
        var url_id = document.location.pathname.split("/")[2].split("-").pop();
        var url_hash = parseInt(document.location.hash.substring(4));

        var page = 0;
        if (url_bol.length < 4) {
            page = 1;
        } else {
            page = url_bol[3];
        }
        var topic_title = document.querySelector("h1.main").textContent;

        var id_list = [];

        webdb.open();
        webdb.createTable();
        webdb.getPageFav(url_id, page, loadPage);

        function loadPage(tx, data) {
            for (var i = 0; i < data.rows.length; i++) {
                id_list.push(data.rows[i].msg_id);
            }

            var postlar = document.querySelectorAll("li.ForumMessage");

            postlar.forEach(function (item, index) {
                if (item.classList.contains("ForumFolder")) return;

                var msg_id = parseInt(
                    item.querySelector("div.posthead > a").id.substring(3)
                );

                if (msg_id == url_hash) {
                    item.style = "box-shadow: 0px 0px 15px 3px rgb(253, 253, 0);";
                    item.scrollIntoView(true);
                    window.scrollTo(window.scrollX, window.scrollY - 20);
                }

                var username = item.querySelector("div.postMain > div.postPanel > a")
                .textContent;

                var button = document.createElement("button");
                button.style =
                    "background-image: url(/img/icon/misc/star.png); background-position: center; height: 20px; width: 20px; border: 0; padding: 5px 0 5px 0; margin: 0 5px 0 0;";
                button.dataset.id = msg_id;
                button.dataset.username = username;
                button.addEventListener("click", click_fav);

                if (id_list.indexOf(msg_id) > -1) {
                    button.style.backgroundColor = "#FF3333";
                    button.dataset.status = 1;
                } else {
                    button.style.backgroundColor = "#26E686";
                    button.dataset.status = 0;
                }

                item.querySelector("div.posthead > span.postHeadRight").prepend(button);
            });
        }

        function click_fav(event) {
            event.preventDefault();

            var msg_id = this.dataset.id;
            var username = this.dataset.username;
            var url = url_bol[2];

            webdb.addFav(topic_title, username, msg_id, url, url_id, page);

            if (this.dataset.status == 1) {
                this.dataset.status = 0;
                this.style.backgroundColor = "#26E686";
            } else {
                this.dataset.status = 1;
                this.style.backgroundColor = "#FF3333";
            }
        }
    } else if (document.location.pathname.indexOf("/Members/") > -1) {
        var cookie_mid = document.cookie.split("MemberId=")[1].split("&")[0];
        var table_mid = parseInt(
            document.querySelector(
                "table.infotable > tbody > tr:nth-of-type(6) > td:nth-of-type(2)"
            ).textContent
        );

        if (cookie_mid == table_mid) {
            webdb.open();
            webdb.createTable();

            webdb.getFullFav(full_fav);

            function full_fav(tx, data) {
                var styleSheet = document.createElement("style");
                styleSheet.type = "text/css";
                styleSheet.innerText = ".tableBodyScroll tbody {display: block; max-height: 300px; overflow-y: scroll;} .tableBodyScroll thead, .tableBodyScroll tbody tr { display: table; width: 100%; table-layout: fixed;}";
                document.head.appendChild(styleSheet);

                var myTable = document.querySelector("table.forumwindow");
                var myClone = myTable.cloneNode(true);
                myClone.className = "";
                myClone.classList.add("tableBodyScroll");
                myClone.querySelector("caption").textContent = "Favori Mesajlarım";

                var a = document.createElement("a");
                a.textContent = "Export";
                a.style = "margin: 0 5px 0 5px; float: right; font-size: small;"
                a.addEventListener("click", db_export);
                myClone.querySelector("caption").appendChild(a);

                a = document.createElement("a");
                a.textContent = "Import";
                a.style = "margin: 0 5px 0 5px; float: right; font-size: small;"
                a.addEventListener("click", db_import);
                myClone.querySelector("caption").appendChild(a);

                a = document.createElement("a");
                a.textContent = "Reset";
                a.style = "margin: 0 5px 0 5px; float: right; font-size: small;"
                a.addEventListener("click", db_reset);
                myClone.querySelector("caption").appendChild(a);

                myClone.querySelector("thead > tr > th").style.width = "";
                myClone.querySelector("thead > tr > th:nth-of-type(2)").textContent = "Kullanıcı"
                var th = document.createElement("th");
                th.textContent = "İşlem";
                th.style.width = "100px";
                myClone.querySelector("thead > tr").appendChild(th);

                myClone.querySelector("tbody").textContent = "";

                for (var i = 0; i < data.rows.length; i++) {
                    var row = data.rows[i];
                    var tr = document.createElement("tr");
                    var td = document.createElement("td");

                    a = document.createElement("a");
                    a.href = "/forum/" + row.url + "/" + row.page + "#msg" + row.msg_id;
                    a.innerHTML = '<img src="/img/icon/Folder/FolderSm.png" alt="Konu">' + row.topic_title;
                    a.target = "_blank";
                    td.appendChild(a);
                    tr.appendChild(td);

                    td = document.createElement("td");
                    a = document.createElement("a");
                    a.href = "/Members/" + row.username;
                    a.textContent = row.username;
                    td.appendChild(a);
                    tr.appendChild(td);

                    td = document.createElement("td");
                    var d = new Date(row.added_on);
                    td.textContent = formatDate(d);
                    tr.appendChild(td);

                    td = document.createElement("td");
                    a = document.createElement("a");
                    a.href = "#";
                    a.innerHTML = '<span class="imgbundle crossred"></span>Sil';
                    a.dataset.id = row.msg_id;
                    a.addEventListener("click", fav_sil);
                    td.appendChild(a);
                    td.style.width = "100px";
                    tr.appendChild(td);

                    myClone.querySelector("tbody").appendChild(tr);
                }

                myTable.parentNode.insertBefore(myClone, myTable);
            }

            function db_export()
            {
                webdb.backUp();
            }

            function db_import()
            {
                var pm_id_enc = null;
                var shares = document.querySelectorAll("table.footable-loaded:nth-of-type(2) a:not([class])");
                for (var i = 0; i < shares.length; i++)
                {
                    var el = shares[i];
                    if (el.textContent == "Fav Backup")
                    {
                        pm_id_enc = el.parentElement.querySelector("i").textContent.trim();
                        break;
                    }
                }

                if (pm_id_enc == null){
                    alert("You don't have any backup");
                    return;
                }

                var password = window.prompt("Enter Password:");
                if (password == null || password == "" || password.length < 5) return;

                var pm_id_dec = code.decryptMessage(pm_id_enc, password);
                if (pm_id_dec == false)
                {
                    alert('Data Malformed or Password Error!');
                    return;
                }

                var parser = new DOMParser();
                var data_enc;

                http_get("https://www.tahribat.com/Pm?pmid=" + pm_id_dec).then(function(data){
                    var resp = parser.parseFromString(data, "text/html");
                    data_enc = resp.querySelector("div.panel.panelwarning.first > p:nth-child(2)").textContent.replace(/\n/g, '').replace(/\s/g, '').trim().hexDecode();

                    var data_dec = code.decryptMessage(data_enc, password);
                    if (data_dec == false)
                    {
                        alert('Data Malformed or Password Error!');
                        return;
                    }

                    var b64decoded = decodeURIComponent(escape(window.atob(data_dec)));
                    var sql_cmds = b64decoded.split(";\n");

                    webdb.import(sql_cmds);
                    document.querySelector("table.tableBodyScroll").remove();
                    webdb.getFullFav(full_fav);

                }).catch(function(err){
                    console.log(err);
                });

            }

            function db_reset()
            {
                webdb.resetTable();
                document.querySelector("table.tableBodyScroll").remove();
                webdb.getFullFav(full_fav);
            }

            function fav_sil(event) {
                event.preventDefault();

                var msg_id = this.dataset.id;
                webdb.deleteFav(msg_id);
                document.querySelector("table.tableBodyScroll").remove();
                webdb.getFullFav(full_fav);
            }

        }
    }
})();
