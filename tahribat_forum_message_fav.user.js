// ==UserScript==
// @name         Tahribat Forum Mesaj Favla
// @namespace    http://www.tahribat.com/
// @version      0.1
// @description  Forumda beğendiğiniz mesajları favlayarak daha sonra profilinizde buna erişebilirsiniz.
// @author       pSkpt
// @match        https://*.tahribat.com/*
// @grant        none
// @updateURL    https://github.com/sonerb/Tahribat-Forum-Mesaj-Favla/raw/master/tahribat_forum_message_fav.user.js
// @downloadURL  https://github.com/sonerb/Tahribat-Forum-Mesaj-Favla/raw/master/tahribat_forum_message_fav.user.js
// @supportURL   https://www.tahribat.com/Forum?ref=39260
// @icon         https://www.tahribat.com/favicon.ico
// ==/UserScript==

(function () {
    "use strict";
    var webdb = {};
    webdb.db = null;

    webdb.open = function () {
        var dbSize = 2 * 1024 * 1024; // 5MB
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

                if (msg_id == url_hash)
                {
                    item.style = "box-shadow: 0px 0px 15px 3px rgb(253, 253, 0);"
                    item.scrollIntoView(true);
                    window.scrollTo(window.scrollX, window.scrollY-20);
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
                styleSheet.innerText =
                    ".tableBodyScroll tbody {display: block; max-height: 300px; overflow-y: scroll;} .tableBodyScroll thead, .tableBodyScroll tbody tr { display: table; width: 100%; table-layout: fixed;}";
                document.head.appendChild(styleSheet);

                var myTable = document.querySelector("table.forumwindow");
                var myClone = myTable.cloneNode(true);
                myClone.className = "";
                myClone.classList.add("tableBodyScroll");
                myClone.querySelector("caption").textContent = "Favori Mesajlarım";
                myClone.querySelector("thead > tr > th").style.width = "";
                var th = document.createElement("th");
                th.textContent = "İşlem";
                th.style.width = "100px";
                myClone.querySelector("thead > tr").appendChild(th);

                myClone.querySelector("tbody").textContent = "";

                for (var i = 0; i < data.rows.length; i++) {
                    var row = data.rows[i];
                    var tr = document.createElement("tr");
                    var td_1 = document.createElement("td");
                    var td_2 = document.createElement("td");
                    var td_3 = document.createElement("td");
                    var td_4 = document.createElement("td");
                    var a_1 = document.createElement("a");
                    var a_2 = document.createElement("a");
                    var a_3 = document.createElement("a");

                    a_1.href = "/forum/"+ row.url + "/" + row.page + "#msg" + row.msg_id;
                    a_1.innerHTML = '<img src="/img/icon/Folder/FolderSm.png" alt="Konu">' + row.topic_title;
                    a_1.target = "_blank";
                    td_1.appendChild(a_1);
                    tr.appendChild(td_1);

                    a_2.href = "/Members/" + row.username;
                    a_2.textContent = row.username;
                    td_2.appendChild(a_2);
                    tr.appendChild(td_2);

                    var d = new Date(row.added_on);
                    td_3.textContent = formatDate(d);
                    tr.appendChild(td_3);

                    a_3.href = "#";
                    a_3.innerHTML = '<span class="imgbundle crossred"></span>Sil';
                    a_3.dataset.id = row.msg_id;
                    a_3.addEventListener("click", fav_sil);
                    td_4.appendChild(a_3);
                    td_4.style.width = "100px";
                    tr.appendChild(td_4);

                    myClone.querySelector("tbody").appendChild(tr);
                }

                myTable.parentNode.insertBefore(myClone, myTable);
            }

            function fav_sil(event)
            {
                event.preventDefault();

                var msg_id = this.dataset.id;
                webdb.deleteFav(msg_id);
                document.querySelector("table.tableBodyScroll").remove();
                webdb.getFullFav(full_fav);
            }

            function formatDate(d)
            {
                var day = (d.getDate() < 10 ? "0"+d.getDate() : d.getDate());
                var month = (d.getMonth() < 10 ? "0"+d.getMonth() : d.getMonth());
                var hour = (d.getHours() < 10 ? "0"+d.getHours() : d.getHours());
                var minute = (d.getMinutes() < 10 ? "0"+d.getMinutes() : d.getMinutes());

                return day + "/" + month + "/"+ d.getFullYear() + " " + hour + ":" + minute;
            }
        }
    }
})();
