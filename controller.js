    /* $Id$ */
    //ignorei18n_start
    /* jshint ignore:start */
    import Ember from 'ember';
    import {
    Mapper as Mapper
    }


    from "rmpEmberApp/components/ui-toolkit"; //No I18N
    var mycontroller; // to stop gif animation
    export default Ember.Controller.extend({
    needs: ['application'],
    actions: {
        buttonActions: function(id) {
            if ((id == 'createVirtualServer') || (id.indexOf("configurescvmmchildhost") != -1)) {
                //  Ember.$("#createVirtualServer").addClass('disableDiv');
                //  Ember.$('#createVirtualServer').text(jsRb['rmp.dashboard.adding']).css('opacity','0.5');
                //  Ember.$('#cancel').css('opacity','0');
                this.send("addserver", id);
            } else if (id == 'cancel') {
                Ember.$('#serverName').val("");
                Ember.$('#portName').val("443");
                Ember.$('#userName').val("");
                Ember.$('#passName').val("");
                Ember.$("#createVirtualServer").removeClass('disableDiv');
                Ember.$('#cancel').css('opacity', '1');
                Ember.$('#createVirtualServer').text("Add").css('opacity', '1');
                Ember.$('#addserverDiv').addClass('rmpHide');
                Ember.$('#serverDiv').removeClass('rmpHide');
                Ember.$('#addServer-btn').toggleClass('rmpHide');
                Ember.$('#licenseMgmt-btn').toggleClass('rmpHide');
                Ember.$('#environment-label').toggleClass('rmpHide');
                Ember.$('#environmentFilter').toggleClass('rmpHide');

                this.set("servertotalcount", 0);
                this.set("serverrangestart", 1);

                this.set("vmViewrangestart", 1);
                this.set("vmViewvmcount", 0);
                this.set("limit", 10);

                this.send('serverViewInput', "cancel");
            }
        },
        addserver: function(id) {
            var isScvmmChildHost = false;
            var hostid= 0;
            var virtualEnvironment,connectionType,serverName,port,userName,fullName,password;
            if(id.indexOf("configurescvmmchildhost") != -1){
                isScvmmChildHost = true;
                hostid = id.substring(23, id.length);
                virtualEnvironment = "2";
                connectionType = "SCVMM";
                serverName = Ember.$("#hostname" + hostid).text();
                port = "443";
                userName =Ember.$("#userName"+hostid).val().trim();
				fullName =Ember.$("#fullName"+hostid).val().trim();
                password = Ember.$("#passName"+hostid).val();
				
            }
            else{
                virtualEnvironment = this.get("selectedenvironment");
                connectionType = this.get("selectedconnectiontype");
                serverName = Ember.$("#serverName").val().trim();
                port = Ember.$("#portName").val().trim();
                userName = Ember.$('#userName').val().trim();
				fullName = Ember.$('#fullName').val().trim();
                password = Ember.$('#passName').val();
            }
            if (serverName == "") {
                Freezer.on();
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vbackup.please_enter_the_name_of_the_server'], "Freezer.off()");
                return;
            }
            if (port == "" || isNaN(port)) {
                Freezer.on();
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vbackup.please_enter_a_valid_port_number'], "Freezer.off()");
                return;
            }
            if(virtualEnvironment == '2' && Ember.$("#isLogonAuth").hasClass('offBtn') && !isScvmmChildHost)
            {
                if(connectionType == "SCVMM" && ValidateIPaddress(serverName)){
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vconfiguration.please_enter_host_name'], "Freezer.off()");
                    return;
                }
                userName = "-";
                password = "-";
            }
            else if(isScvmmChildHost && Ember.$("#isLogonAuth" + hostid).hasClass('offBtn') && virtualEnvironment == '2')
            {
                userName = "-";
                password = "-";
            }
            else
            {
                if (userName == "") {
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vbackup.please_enter_a_valid_username'], "Freezer.off()");
                    return;
                }
                //check for domain in username
                if ((userName.indexOf("\\") == -1)&& virtualEnvironment == '2') {
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vbackup.please_enter_a_valid_username'], "Freezer.off()");
                    return;
                }
                if (password == "") {
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vbackup.please_enter_a_security_password'], "Freezer.off()");
                    return;
                }
            }
            var Dobject = {
                operation: "addNewServer",
                serverdetails: {
                    virtualEnvironment: virtualEnvironment,
                    hostid :hostid,
                    connectionType: connectionType,
                    isScvmmChildHost: isScvmmChildHost,
                    servername: serverName,
                    port: port,
                    username: encodeURIComponent(userName),
					fullName: fullName,
                    password: encodeURIComponent(password)
                }
            };

            Dobject.serverdetails.username = encodeURIComponent(Dobject.serverdetails.username);
            Dobject.serverdetails.password = encodeURIComponent(Dobject.serverdetails.password);



            var apiUrl = '/virtualConfiguration.do?methodToCall=addNewServer'; //NO I18N
            //var objects = serverReq(apiUrl, Dobject, true);
            
            var _this = this;
            Freezer.on();
            if(isScvmmChildHost && virtualEnvironment == "2"){
                //Freezer.bringFront();
                if(!Ember.$("#erroricon"+hostid).hasClass("rmpHide")){
                    Ember.$("#erroricon"+hostid).addClass("rmpHide");
                }
                Ember.$("#configurescvmmchildhost"+hostid).addClass("rmpHide");
                Ember.$("#loadinggif"+hostid).removeClass("rmpHide");
                Ember.$("#configurestatus"+hostid).text("Installing...");
                Ember.$("#configurestatus"+hostid).prop('title',"Installing...");
                Ember.$("#configurestatus"+hostid).removeClass("rmpHide");
                Ember.$("#isLogonAuth" + hostid).addClass('disableDiv');
                if(Ember.$("#isLogonAuth" + hostid).hasClass('onBtn')){
                    Ember.$("#userName"+hostid).addClass('disableDiv');
                    Ember.$("#passName"+hostid).addClass('disableDiv');
                }  
            }
            else{
                Ember.$("#spinnerWheel").removeClass("rmpHide"); 
            }
            testreq(apiUrl, Dobject).done(function(data) {
                if (data == undefined) {
                    if(!isScvmmChildHost){
                    Freezer.off();
                    }
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    Notify.show(jsRb['rmp.common.virtual.request_could_not_be_processed'], 2);
                } else if (data.hasOwnProperty("errorCode")) {
                    //Freezer.on();
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    var freezerPosition = "Freezer.off()";
                    if((virtualEnvironment == "2")&&isScvmmChildHost){
                        freezerPosition = "Freezer.sendBack()";
                    }
                    if(!isScvmmChildHost){
                        if(data.errorCode==401){
                            Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[data.errorMsg], freezerPosition);
                        }else{
                            Popup.alert(i18n.Popup.msgTypes.invalidOperation,data.errorMsg,freezerPosition);
                        }
                    }
                    else{
                        var errMsg = "";
                        if(data.errorCode==401){
                            errMsg = jsRb[data.errorMsg];
                        }
                        else{
                            errMsg = data.errorMsg;
                        }
                        var hostid = id.substring(23, id.length);
                        Freezer.sendBack();
                        Ember.$("#loadinggif"+hostid).addClass("rmpHide");
                        Ember.$("#configurescvmmchildhost"+hostid).text('Retry');
                        Ember.$("#configurestatus"+hostid).text(errMsg.substring(0,6) + "...");
                        Ember.$("#configurestatus"+hostid).prop('title', errMsg);
                        Ember.$("#erroricon"+hostid).removeClass("rmpHide");
                        Ember.$("#configurestatus"+hostid).removeClass("rmpHide");
                        Ember.$("#configurescvmmchildhost"+hostid).removeClass("rmpHide");
                        Ember.$("#isLogonAuth" + hostid).removeClass('disableDiv');
                        if(Ember.$("#isLogonAuth" + hostid).hasClass('onBtn')){
                            Ember.$("#userName"+hostid).removeClass('disableDiv');
                            Ember.$("#passName"+hostid).removeClass('disableDiv');
                        }
                    }
                    //Notify.show(data.errorMsg, 2);
                } else {
                    Ember.$("#spinnerWheel").addClass("rmpHide");

                    if((virtualEnvironment == "2")&&(connectionType == "SCVMM")){
                    if(isScvmmChildHost){
                            var hostid = id.substring(23, id.length);

                            //setting username value. default rendered value is empty
                            if(Ember.$("#isLogonAuth" + hostid).hasClass('onBtn')) //if logon auth is used credentials column remains unchanged
                            {
                            Ember.$("#userNameValue"+hostid).text(userName);

                            Ember.$("#userNameColon"+hostid).removeClass("rmpHide");
                            Ember.$("#userNameValue"+hostid).removeClass("rmpHide");
                            }

                            Ember.$("#userName"+hostid).addClass('disableDiv');
                            Ember.$("#passName"+hostid).addClass('disableDiv');
                            Ember.$("#userName"+hostid).addClass("rmpHide");
                            Ember.$("#passName"+hostid).addClass("rmpHide");

                            Ember.$("#loadinggif"+hostid).addClass("rmpHide");
                            Ember.$("#isLogonAuth" + hostid).addClass('rmpHide');
                            Ember.$("#edit_"+hostid).removeClass('disableDiv');
                            Ember.$("#edit_"+hostid).removeClass("rmpHide");
                            Ember.$("#configurescvmmchildhost"+hostid).addClass("rmpHide");
                            Ember.$("#configurestatus"+hostid).removeClass("rmpHide");
                            Ember.$("#configurestatus"+hostid).text("Installed");
                            Ember.$("#configurestatus"+hostid).prop('title',"Installed");
                            Freezer.sendBack();
                            Notify.show("New Server Added");
                     }
                    else{
                            Freezer.off();
                            _this.send("bringfrontselecthostpopup",data);
                      }
                    }
                    else{
                    Freezer.off();
                    _this.send("setFilterdropdownFromnew");
                    _this.send('buttonActions', 'cancel')
                    Notify.show(jsRb['rmp.virtual.vbackup.new_server_added']);
                    }

                }
            });

        },
        editserverpopupfill: function(id) {
            var type=id.substring(0,1);
            var serverid = id.substring(6, id.length);
            var virtualEnvironment = this.get('selectedenvironmentfilter');
            var Dobject = {
                "operation": "getServers",
                "serverids": [serverid],
                "limit": 1,
                "rangestart": 1,
                "servertype":type,
                "virtualEnvironment": virtualEnvironment
            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=getServers'; //NO I18N
            var portRow = "";
            var serverNameRow ="";
            var isLogonAuthCheck ="rmpHide";
            var authRow = "rmpHide";
            var objects = serverReq(apiUrl, Dobject, false);
            var serverdetails = objects;
            var servers = serverdetails.serverdetails.servers;
            var serverList = {};
            var userplaceholder = jsRb['rmp.login.admin'];
            if (servers.length > 0) {
                var obj = servers[0];
                var servername = obj.servername;
                var username = decodeURIComponent(obj.username);
                var port = obj.port;
                var usernameRowHide = "";
                var passwordRowHide = "";
                if(virtualEnvironment == "2")
                {
                    portRow = 'rmpHide';
                    authRow = "";
                    serverNameRow = ' disableDiv';
                    userplaceholder = "host or domain\\username";
                    if(username == "-"){
                        isLogonAuthCheck = "offBtn";
                        usernameRowHide = "rmpHide";
                        passwordRowHide = "rmpHide";
                        username = "";//To show empty input box when authentication is enabled
                    }
                    else{
                        isLogonAuthCheck = "onBtn";
                    }
                }
                var password = "";
                var serverbox = {
                    "name": "editserverName",
                    "dim": [0, 4, 236, 12],
                    fixed: [true, true],
                    "comp": {
                        "name": "input",
                        "type": "HTML",
                        "attributes": [{
                            "type": "type",
                            "value": "text"
                        }, {
                            "type": "style",
                            "value": "position:relative !important"
                        }, {
                            "type": "value",
                            "value": servername
                        }, {
                            "type": "placeholder",
                            "value": jsRb['rmp.virtual.vconfiguration.server_placeholder']
                        },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                    },
                    "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                    "actions": [{
                        "type": "",
                        "method": ""
                    }]
                };
                var portbox = {
                    "name": "editportName",
                    "dim": [0, 4, 236, 12],
                    fixed: [true, true],
                    "comp": {
                        "name": "input",
                        "type": "HTML",
                        "attributes": [{
                            "type": "type",
                            "value": "text"
                        }, {
                            "type": "style",
                            "value": "position:relative !important"
                        }, {
                            "type": "value",
                            "value": port
                        }, {
                            "type": "placeholder",
                            "value": jsRb['rmp.virtual.vconfiguration.port_placeholder']
                        },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                    },
                    "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                    "actions": [{
                        "type": "",
                        "method": ""
                    }]
                };
                var userbox = {
                    "name": "edituserName",
                    "dim": [0, 4, 236, 12],
                    fixed: [true, true],
                    "comp": {
                        "name": "input",
                        "type": "HTML",
                        "attributes": [{
                            "type": "type",
                            "value": "text"
                        }, {
                            "type": "style",
                            "value": "position:relative !important"
                        }, {
                            "type": "value",
                            "value": username
                        }, {
                            "type": "placeholder",
                            "value": userplaceholder
                        },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                    },
                    "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                    "actions": [{
                        "type": "",
                        "method": ""
                    }]
                };
                var passwordbox = {
                    "name": "editpassName",
                    "dim": [0, 4, 236, 12],
                    fixed: [true, true],
                    "comp": {
                        "name": "input",
                        "type": "HTML",
                        "attributes": [{
                            "type": "type",
                            "value":"password"
                        }, {
                            "type": "style",
                            "value": "position:relative !important"
                        }, {
                            "type": "value",
                            "value": ""
                        }, {
                            "type": "placeholder",
                            "value":  jsRb['rmp.recoverySettings.Password']
                        },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                    },
                    "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                    "actions": [{
                        "type": "",
                        "method": ""
                    }]
                };
                var serverinsert = [{
                    id: "",
                    uiFramework: true,
                    compData: JSON.stringify(serverbox)
                }];
                var portinsert = [{
                    id: "",
                    uiFramework: true,
                    compData: JSON.stringify(portbox)
                }];
                var userinsert = [{
                    id: "",
                    uiFramework: true,
                    compData: JSON.stringify(userbox)
                }];
                var passinsert = [{
                    id: "",
                    uiFramework: true,
                    compData: JSON.stringify(passwordbox)
                }];
                Freezer.on();
                Ember.$("#editserverpopup").toggleClass("rmpHide");
                var tr = [{
                    id: "",
                    class: "adspopUpTopBand adsblackFnt adspadding5",
                    th: [{
                        id: "",
                        colspan: "2",
                        class: "",
                        rowValue: [{
                            style: "font-weight:bold;",
                            value: jsRb['rmp.virtual.vconfiguration.edit_configuration'],
                            class: "adsflLeft adsblackFnt"
                        }, {
                            id: "addstoragepopupClose",
                            value: "",
                            class: "adsflRight adspopupDivClose",
                            divAction: "closeeditserverpopup"
                        }]
                    }]
                }, {
                    id: "tablerow1",
                    class: "adsmargin10" + serverNameRow,
                    style: " background:#FFFFFF;border-radius:5px;height:35px;",
                    th: [{
                        id: "NameText",
                        class: "transperantBorder",
                        rowValue: [{
                            id: "",
                            class: "adsflRight",
                            i18nText: true,
                            value: "rmp.virtual.vconfiguration.server_name_or_ip_address_colon"
                        }]
                    }, {
                        id: "repositoryinsert",
                        class: "transperantBorder",
                        rowValue: serverinsert
                    }]
                }, {
                    id: "tablerow2",
                    class: "adsmargin10 " + portRow,
                    style: " background:#FFFFFF;border-radius:5px;height:35px;",
                    th: [{
                        id: "StorageText",
                        class: "transperantBorder",
                        rowValue: [{
                            id: "",
                            class: "adsflRight",
                            i18nText: true,
                            value: "rmp.virtual.vconfiguration.port_colon"
                        }]
                    }, {
                        id: "pathinsert",
                        class: "transperantBorder",
                        rowValue: portinsert
                    }]
                }, {
                    id: "AuthenticationEditrow",
                    class: authRow,
                    style: " background:#FFFFFF;border-radius:5px;height:35px;",
                    th: [{
                        id: "",
                        class: "transperantBorder",
                        rowValue: [{
                            id: "",
                            class: "adsflRight",
                            i18nText:true,
                            value: "rmp.virtual.vrepository.authentication_colon"
                        }]
                    }, {
                        id: "",
                        class: "transperantBorder",
                        style: "",
                        rowValue: [{
                            id: "isLogonAuthedit",
                            class: "adsflRight cursorPointer " + isLogonAuthCheck,
                            value: "",
                            title: jsRb['rmp.virtual.vrepository.isLocal_title'],
                            style: "position:relative;left:-246px;",
                            divAction: "edittoggleCredentials"
                        }, {
                            id: "authenticatioInfo",// No I18N
                            class: "truncate adsflRight small-info",// No I18N
                            style: "position:relative;left:-202px;top:1px;",// No I18N
                            value: "",// No I18N
                            title: jsRb['rmp.virtual.vconfiguration.authentication_message'],
                            divAction: ""// No I18N
                        }]
                    }]
                }, {
                    id: "edittablerow3",
                    class: "adsmargin10 " + usernameRowHide,
                    style: " background:#FFFFFF;border-radius:5px;height:35px;",
                    th: [{
                        id: "loginNameTxt",
                        class: "transperantBorder",
                        rowValue: [{
                            id: "",
                            class: "adsflRight",
                            i18nText: true,
                            value: "rmp.virtual.vconfiguration.username_colon"
                        }]
                    }, {
                        id: "userinsert",
                        class: "transperantBorder",
                        rowValue: userinsert
                    }]
                }, {
                    id: "edittablerow4",
                    class: "adsmargin10 " + passwordRowHide,
                    style: " background:#FFFFFF;border-radius:5px;height:35px;",
                    th: [{
                        id: "passwordTxt",
                        class: "transperantBorder",
                        rowValue: [{
                            id: "",
                            class: "adsflRight",
                            i18nText: true,
                            value: "rmp.virtual.vconfiguration.password_colon"
                        }]
                    }, {
                        id: "passinsert",
                        class: "transperantBorder",
                        rowValue: passinsert
                    }]
                }, {
                    id: "",
                    class: "adsmargin10",
                    th: [{
                        id: "left1",
                        value: "",
                        colspan: "1"
                    }, {
                        id: "id",
                        colspan: "2",
                        class: "adsinlineAndBlock adsflLeft adsValignTop msg",
                        rowValue: [{
                            id: id,
                            divAction: "saveserverchanges",
                            value: jsRb['rmp.recoverySettings.Save'],
                            class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButtonSmall"
                        }, {
                            divAction: "closeeditserverpopup",
                            value: jsRb['rmp.recoverySettings.Cancel'],
                            class: "adsinlineAndBlock adsgrayButtonSmall adswhiteSpace adsmargin5 deselectComponent"
                        }]
                    }]
                }];
                var tableRow = {
                    id: "addstoragepopupbody",
                    class: "popup popupAlert adsfntFamily adsfntSize adsgrayfont",
                    style: "width:auto!important;",
                    tbody: {
                        id: "",
                        class: "",
                        tr: tr
                    }
                };
                var data = {
                    row: tableRow
                };
                Mapper.getCell("editserverpopup").setData(data);
            } else {
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vconfiguration.server_could_not_be_contacted'], "Freezer.off()");
            }
        },
        closeeditserverpopup: function() {
            Mapper.getCell('editserverpopup').deleteData();
            Ember.$('#editserverpopup').toggleClass('rmpHide');
            Freezer.off();
            this.send("serverViewInput");
        },
        saveserverchanges: function(id) {
            var serverid,servertype,serverName,port,userName,password;
            var isScvmmChildHost = false;
            if(id.indexOf("updatehost") != -1){
                isScvmmChildHost = true;
            }
            var virtualEnvironment = this.get("selectedenvironmentfilter");
            if(!isScvmmChildHost){
                serverid = id.substring(6, id.length);
                servertype = id.substring(0, 1);
                serverName = Ember.$("#editserverName").val().trim();
                port = Ember.$("#editportName").val().trim();
                userName = Ember.$('#edituserName').val().trim();
                password = Ember.$('#editpassName').val();
            }
            else{
                serverid = id.substring(10, id.length);
                servertype = "2";
                serverName = Ember.$("#hostname" + serverid).text();
                port = "443";
                userName = Ember.$("#userName"+serverid).val().trim();
                password = Ember.$("#passName"+serverid).val();
            }


            if (serverName == "") {
                Freezer.on();
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vbackup.please_enter_the_name_of_the_server'], "Freezer.off()");
                return;
            }
            if (port == "" || isNaN(port)) {
                Freezer.on();
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vbackup.please_enter_a_valid_port_number'], "Freezer.off()");
                return;
            }
            if(Ember.$("#isLogonAuth"+ serverid).hasClass("offBtn") && isScvmmChildHost && virtualEnvironment ==2)
            {
                userName = "-";
                password = "-";
            }
            else if(Ember.$("#isLogonAuthedit").hasClass("offBtn") && !isScvmmChildHost && virtualEnvironment ==2)
            {
                userName = "-";
                password = "-";
            }
            else
            {
                var freezerCloseAction = "Freezer.off()";
                if(isScvmmChildHost){
                    freezerCloseAction = "";
                }
                if (userName == "") {
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vbackup.please_enter_a_valid_username'], freezerCloseAction);
                    return;
                }
                //check for domain in username
                if ((userName.indexOf("\\") == -1)&& virtualEnvironment == '2') {
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vbackup.please_enter_a_valid_username'], freezerCloseAction);
                    return;
                }
                if (password == "") {
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vbackup.please_enter_a_security_password'], freezerCloseAction);
                    return;
                }
            }

            var Dobject = {
                operation: "updateServer",
                changedserverdetails: {
                    serverid: serverid,
                    servertype: servertype,
                    servername: serverName,
                    port: port,
                    username: encodeURIComponent(userName),
                    password: encodeURIComponent(password),
                    virtualEnvironment: virtualEnvironment
                }
            };

            Dobject.changedserverdetails.username = encodeURIComponent(Dobject.changedserverdetails.username);
            Dobject.changedserverdetails.password = encodeURIComponent(Dobject.changedserverdetails.password);

            var apiUrl = '/virtualConfiguration.do?methodToCall=updateServer'; //NO I18N
            //var objects = serverReq(apiUrl, Dobject, false);
            Freezer.bringFront();
            Ember.$("#spinnerWheel").removeClass("rmpHide");
            var _this = this;
            testreq(apiUrl, Dobject).done(function(objects) {
                if (objects == undefined) {
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.common.virtual.request_could_not_be_processed'], "Freezer.sendBack()");
                } else if (objects.hasOwnProperty("errorCode")) {
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    Freezer.bringFront();
                    if(objects.errorCode==401){
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[objects.errorMsg], "Freezer.sendBack()");
                    }else{
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, objects.errorMsg, "Freezer.sendBack()");
                    }
                } else {
                    Freezer.sendBack();
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    Notify.show("Configuration has been Updated");
                    if(isScvmmChildHost){
                            Ember.$("#userName"+serverid).addClass('disableDiv');
                            Ember.$("#passName"+serverid).addClass('disableDiv');
                            Ember.$("#updatehost"+serverid).addClass('disableDiv');
                            Ember.$("#edit_"+serverid).removeClass("rmpHide");  
                            //if(Ember.$("#isLogonAuth"+ serverid).hasClass("onBtn")){
                                Ember.$("#userName"+serverid).addClass("rmpHide");
                                Ember.$("#passName"+serverid).addClass("rmpHide");
                                Ember.$("#isLogonAuth"+serverid).addClass("rmpHide");
                                Ember.$("#updatehost"+serverid).addClass("rmpHide");
                                
                                Ember.$("#userName"+serverid).val(userName);
                                Ember.$("#passName"+serverid).val("");
                                Ember.$("#userNameValue"+serverid).text(userName);
                                if(Ember.$("#isLogonAuth"+ serverid).hasClass("onBtn")){
                                    Ember.$("#userNameValue"+serverid).removeClass("rmpHide");

                                    Ember.$("#userNameColon"+serverid).removeClass("rmpHide");
                                }
                            //}
                    }
                    else{
                            _this.send("closeeditserverpopup");
                    }
                }
            });
        },
        serverInput: function() {
            var selectedenvironment = this.get("selectedenvironment");
            var tableRow, data;
            var serverbox = {
                "name": "serverName",
                "dim": [0, 4, 236, 12],
                fixed: [true, true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "text"
                    }, {
                        "type": "style",
                        "value": "position:relative !important"
                    }, {
                        "type": "placeholder",
                        "value": jsRb['rmp.virtual.vconfiguration.server_placeholder']
                    },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                },
                "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                "actions": [{
                    "type": "",
                    "method": ""
                }]
            };
            var portbox = {
                "name": "portName",
                "dim": [0, 4, 236, 12],
                fixed: [true, true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "text"
                    }, {
                        "type": "style",
                        "value": "position:relative !important"
                    }, {
                        "type": "placeholder",
                        "value": jsRb['rmp.virtual.vconfiguration.port_placeholder']
                    }, {
                        "type": "value",
                        "value": jsRb['rmp.virtual.vconfiguration.port_placeholder']
                    },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                },
                "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                "actions": [{
                    "type": "",
                    "method": ""
                }]
            };
            var userbox = {
                "name": "userName",
                "dim": [0, 4, 236, 12],
                fixed: [true, true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "text"
                    }, {
                        "type": "style",
                        "value": "position:relative !important"
                    }, {
                        "type": "placeholder",
                        "value": jsRb['rmp.login.admin']
                    },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                },
                "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                "actions": [{
                    "type": "",
                    "method": ""
                }]
            };
			var nameBox = {
                "name": "fullName",
                "dim": [0, 4, 236, 12],
                fixed: [true, true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "text"
                    }, {
                        "type": "style",
                        "value": "position:relative !important"
                    }, {
                        "type": "placeholder",
                        "value": "Enter your name"
                    },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                },
                "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                "actions": [{
                    "type": "",
                    "method": ""
                }]
            };
            var passwordbox = {
                "name": "passName",
                "dim": [0, 4, 236, 12],
                fixed: [true, true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "password"
                    }, {
                        "type": "style",
                        "value": "position:relative !important"
                    }, {
                        "type": "placeholder",
                        "value": jsRb['rmp.recoverySettings.Password']
                    },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                },
                "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                "actions": [{
                    "type": "",
                    "method": ""
                }]
            };
            var environmentbox = {
                "name": "environmentName",
                "dim": [150, 8, 236, 12],
                "fixed": [true, true],
                "classNames": ["adsinlineAndBlock "],
                "comp": {
                    "type": "dynamic",
                    "data": true,
                    "name": "ui-multidropdown",
                    "attributes": [{
                            "type": "style",
                            "value": ""
                        }]
                },
                "actions": [{
                    "type": "didInsertElement",
                    "method": "populateenvironmentName"
                }]
            };
            var connectionbox = {
                "name": "connectionName",
                "dim": [0, 4, 236, 12],
                "fixed": [true, true],
                "classNames": ["adsinlineAndBlock "],
                "comp": {
                    "type": "dynamic",
                    "data": true,
                    "name": "ui-multidropdown",
                    "attributes": [{
                            "type": "style",
                            "value": "position:relative;width:auto;"
                        }]
                },
                "actions": [{
                    "type": "didInsertElement",
                    "method": "populateconnectionName"
                }]
            };
            var radioStandalone  = {
                "name":"radio1",
                "dim":[-2,0,13,28],
                "classNames":["adsinlineAndBlock"],
                "fixed":[true,true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "radio"
                    },{
                        "type": "name",
                        "value": "selectedradio"
                    },{
                        "type":"style",
                        "value":"position:relative !important;float:left;"
                    },{
                        "type":"checked",
                        "value":true
                    },{
                        "type":"value",
                        "value":"Standalone"
                    }]
                },
                "actions": [{
                    "type": "click",
                    "method": "radioButtonChanged"
                }]
                };
            var radioScvmm  = {
                "name":"radio2",
                "dim":[-142,0,13,28],
                "classNames":["adsinlineAndBlock"],
                "fixed":[true,true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "radio"
                    },{
                        "type": "name",
                        "value": "selectedradio"
                    },{
                        "type":"style",
                        "value":"position:relative !important;float:left;"
                    },{
                        "type":"checked",
                        "value":false
                    },{
                        "type":"value",
                        "value":"SCVMM"
                    }]
                },
                "actions": [{
                    "type": "click",
                    "method": "radioButtonChanged"
                }]
                };
            var serverinsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(serverbox)
            }];
            var portinsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(portbox)
            }];
            var userinsert = [{
                id: "userinsert",
                uiFramework: true,
                compData: JSON.stringify(userbox)
            }];
			var nameInsert = [{
                id: "nameInsert",
                uiFramework: true,
                compData: JSON.stringify(nameBox)
            }];
            var passinsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(passwordbox)
            }];
            var environmentinsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(environmentbox)
            }];
            var connectioninsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(connectionbox)
            }];
            var radiobuttoninsert = [{
                uiFramework: true,
                compData: JSON.stringify(radioStandalone)
            }];
            tableRow = {
                id: "tableBody",
                class: "",
                tbody: {
                    id: "tableBody1",
                    class: "",
                    tr: [{
                        id: "tablerow0",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "head0",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                i18nText: false,
                                value: "Virtual Environment : "
                            }]
                        }, {
                            id: "environmentinsert",
                            class: "transperantBorder",
                            rowValue: environmentinsert
                        }]
                    }, {
                        id: "tablerow1",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "head1",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                i18nText: true,
                                value: "rmp.virtual.vconfiguration.server_name_or_ip_address_colon"
                            }]
                        },{
                            id: "serverinsert",
                            class: "transperantBorder",
                            rowValue: serverinsert
                        },{
                            id: "alertIcon1",
                            class: "small-info adsmargin3 adsflRight",
                            style:"position:relative;left:50%;margin-left:0px;top:11px;",
                            title:jsRb['rmp.virtual.vconfiguration.please_add_vcenter'],
                            value: "",
                            divAction: ""
                        }]
                    }, {
                        id: "tablerowradio",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        class: "rmpHide",
                        th: [{
                            id: "head1",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                i18nText: false,
                                value: "Server Type : "
                            }]
                        }, {
                            id: "",
                            style: "cursor:pointer;",
                            rowValue:  [{
                                    id: "2_connectionType",
                                    divAction: "radioButtonChecked",
                                    class: "ico14x14 optSel adsmargin3 adsflLeft adsinlineAndBlock",
                                    value: ""
                                }, {
                                    id: "",
                                    class: "adsflLeft adsinlineAndBlock",
                                    style: "margin-left:2px; margin-top:4px",
                                    i18nText: false,
                                    value: "Standalone Server"
                                }, {
                                    id: "1_connectionType",
                                    divAction: "radioButtonChecked",
                                    class: "ico14x14 opt adsmargin3 adsflLeft adsinlineAndBlock",
                                    style: "margin-left:30px;",
                                    value: ""
                                }, {
                                    id: "",
                                    class: "adsflLeft adsinlineAndBlock",
                                    style: "margin-left:2px; margin-top:4px",
                                    i18nText: false,
                                    value: "SCVMM"
                                }]
                        }]
                    }, {
                        id: "tablerow2",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        class: "",
                        th: [{
                            id: "head1",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                i18nText: true,
                                value: "rmp.virtual.vconfiguration.port_colon"
                            }]
                        }, {
                            id: "portinsert",
                            class: "transperantBorder",
                            rowValue: portinsert
                        }]
                    }, {
                        id: "Authenticationrow",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        class: "rmpHide",
                        th: [{
                            id: "",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                i18nText:true,
                                value: "rmp.virtual.vrepository.authentication_colon"
                            }]
                        }, {
                            id: "",
                            class: "transperantBorder",
                            style: "",
                            rowValue: [{
                                id: "isLogonAuth",
                                class: "adsflRight cursorPointer offBtn",
                                value: "",
                                title: jsRb['rmp.virtual.vrepository.isLocal_title'],
                                style: "position:relative;left:-206px;",
                                divAction: "toggleCredentials"
                            },{
                                id: "authenticatioInfo",// No I18N
                                class: "truncate adsflRight small-info",// No I18N
                                style: "position:relative;left:-162px;top:2px;",// No I18N
                                value: "",// No I18N
                                title: jsRb['rmp.virtual.vconfiguration.authentication_message'],
                                divAction: ""// No I18N
                            }]
                        }]
                    }, {
                        id: "tablerow3",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "loginNameTxt",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                i18nText: true,
                                value: "rmp.virtual.vconfiguration.username_colon"
                            }]
                        }, {
                            id: "userinsert",
                            class: "transperantBorder",
                            rowValue: userinsert
                        }]
                    }, {
                        id: "tablerow4",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "passwordTxt",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                i18nText: true,
                                value: "rmp.virtual.vconfiguration.password_colon"
                            }]
                        }, {
                            id: "passinsert",
                            class: "transperantBorder",
                            rowValue: passinsert
                        }]
                    },
					{
                        id: "tablerow5",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "myName",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                value: "Name: "
                            }]
                        }, {
                            id: "nameInsert",
                            class: "transperantBorder",
                            rowValue: nameInsert
                        }]
                    },
					{
                        id: "tablerow6",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "head1",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "",
                                value: ""
                            }]
                        }, {
                            id: "head2",
                            class: "",
                            rowValue: [{
                                id: "createVirtualServer",
                                class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButton",
                                i18nText: true,
                                value: "rmp.admin.technicians.add",
                                divAction: "buttonActions"
                            }, {
                                id: "cancel",
                                title: jsRb['rmp.domainsettings.Click_to_Escape_from_here'],
                                class: "adsinlineAndBlock adsgrayButton adswhiteSpace adsmargin5 deselectComponent",
                                i18nText: true,
                                value: "rmp.admin.technicians.cancel",
                                divAction: "buttonActions"
                            }]
                        }]
                    }]
                }
            };
            data = {
                row: tableRow
            };
            Mapper.getCell('addserver-tbl').setData(data); //No I18N
        },
        edittoggleCredentials: function () {
            if (Ember.$('#isLogonAuthedit').hasClass('onBtn')) {
                Ember.$('#isLogonAuthedit').removeClass('onBtn').addClass('offBtn');
                Ember.$('#edittablerow3').addClass('rmpHide');
                Ember.$('#edittablerow4').addClass('rmpHide');
            } else {
                Ember.$('#isLogonAuthedit').removeClass('offBtn').addClass('onBtn');
                Ember.$('#edittablerow3').removeClass('rmpHide');
                Ember.$('#edittablerow4').removeClass('rmpHide');
            }
        },
        toggleCredentials: function () {
            if (Ember.$('#isLogonAuth').hasClass('onBtn')) {
                Ember.$('#isLogonAuth').removeClass('onBtn').addClass('offBtn');
                Ember.$('#tablerow3').addClass('rmpHide');
                Ember.$('#tablerow4').addClass('rmpHide');
            } else {
                Ember.$('#isLogonAuth').removeClass('offBtn').addClass('onBtn');
                Ember.$('#tablerow3').removeClass('rmpHide');
                Ember.$('#tablerow4').removeClass('rmpHide');
            }
        },
        radioButtonChecked: function(id){
            var connectionType = id.charAt(0);
            
            if(!Ember.$("#"+id).hasClass("optSel"))
            {
                if(connectionType == "1"){
                    this.set("selectedconnectiontype","SCVMM");
                    Ember.$("#1_connectionType").removeClass("opt");
                    Ember.$("#1_connectionType").addClass("optSel");
                    Ember.$("#2_connectionType").removeClass("optSel");
                    Ember.$("#2_connectionType").addClass("opt");
                }
                else if(connectionType == "2"){
                    this.set("selectedconnectiontype","Standalone");
                    Ember.$("#2_connectionType").removeClass("opt");
                    Ember.$("#2_connectionType").addClass("optSel");
                    Ember.$("#1_connectionType").removeClass("optSel");
                    Ember.$("#1_connectionType").addClass("opt");
                }
            }
            //Ember.$("#1_connectionType").toggleClass("optSel");
            //Ember.$("#2_connectionType").toggleClass("optSel");
            //Ember.$("#"+id).toggleClass("optSel");
        },
        radioButtonChanged: function(event) {
            var radioButtonName = Ember.$(event.target).prop("name");
            this.set("selectedconnectiontype",Ember.$("input:radio[name="+radioButtonName+"]:checked").val());
        },
        populateenvironmentName: function() {
            var Dobject = {
                operation: "populateVirtualEnvironmentDropdown",
                requestpage: "vconfiguration"
            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=populateVirtualEnvironmentDropdown'; //NO I18N
            var objects = serverReq(apiUrl, Dobject, false);
            var dropdown = {
                class: "adsblockElement",
                span: objects.virtualenvironments
                /*
                span: [{
                    id: "1_VMware",
                    value: "VMware"
                }, {
                    id: "2_Hyper-V",
                    value: "Hyper-V"
                }]
                */
            };
            var selectedId = objects.defaultenvironment.id;
            var selectedenvironment = selectedId.charAt(0);
            this.set("selectedenvironment",selectedenvironment);
            if(selectedenvironment == 2)
            { 
                Ember.$("#tablerow2").addClass("rmpHide");
                Ember.$("#alertIcon1").addClass("rmpHide");
                Ember.$("#tablerowradio").removeClass("rmpHide");
                Ember.$("#Authenticationrow").removeClass("rmpHide");
                if (Ember.$('#isLogonAuth').hasClass('offBtn')) {
                Ember.$('#tablerow3').addClass('rmpHide');
                Ember.$('#tablerow4').addClass('rmpHide');
                }
            }
            var data = {
                dropdownId: "environmentNameId",
                selectAction: "environmentNameselectAction",
                selectedValue: objects.defaultenvironment.value,
                dropdown: dropdown,
                id: "environmentNameselect",
                spanId: "environmentNameslide",
                spanClass: "adsflLeft leftads adsblockElement adsblackFnt",
                divClass: "adsflLeft deselectComponent adspositionRelative dropdown commondropdown adsfntSize",
                dropdownClass: "adsblockElement marginLeftRight",
                dropdownSlideClass: "adsblockElement dropdownSlide dropdownhover uihide",
                dropdownSlideStyle: "width:100%;",
                dropdownStyle: "outline:0;width:222px;height:100%"
            };
            Mapper.getCell("environmentName").setData(data);
        },
        environmentNameselectAction: function(type, id, value) {
            var environmentType = id.charAt(0);
            this.send("environmentNameSelectHelper",environmentType);
            /*
            this.set("selectedenvironment", environmentType);
            if(environmentType == "2")
            {
                Ember.$("#tablerowradio").removeClass("rmpHide");
                Ember.$('#tablerow2').addClass('rmpHide');
                Ember.$("#Authenticationrow").removeClass("rmpHide");
                if (Ember.$('#isLogonAuth').hasClass('offBtn')) {
                Ember.$('#tablerow3').addClass('rmpHide');
                Ember.$('#tablerow4').addClass('rmpHide');
                }
            }
            else if(environmentType == "1")
            {
                if(Ember.$('#tablerow3').hasClass('rmpHide')){
                    Ember.$('#tablerow3').removeClass('rmpHide');
                }
                if(Ember.$('#tablerow4').hasClass('rmpHide')){
                    Ember.$('#tablerow4').removeClass('rmpHide');
                }
                Ember.$("#tablerowradio").addClass("rmpHide");
                Ember.$("#Authenticationrow").addClass("rmpHide");
                Ember.$('#tablerow2').removeClass('rmpHide');
            } */
        },
        environmentNameSelectHelper: function(environmentType){
            this.set("selectedenvironment", environmentType);
            if(environmentType == "2")
            {
                Ember.$("#tablerowradio").removeClass("rmpHide");
                Ember.$("#alertIcon1").addClass("rmpHide");
                Ember.$('#tablerow2').addClass('rmpHide');
                Ember.$("#Authenticationrow").removeClass("rmpHide");
                Ember.$("#userName").attr("placeholder", "host or domain\\username");
                if (Ember.$('#isLogonAuth').hasClass('offBtn')) {
                Ember.$('#tablerow3').addClass('rmpHide');
                Ember.$('#tablerow4').addClass('rmpHide');
                }
            }
            else if(environmentType == "1")
            {
                if(Ember.$('#tablerow3').hasClass('rmpHide')){
                    Ember.$('#tablerow3').removeClass('rmpHide');
                }
                if(Ember.$('#tablerow4').hasClass('rmpHide')){
                    Ember.$('#tablerow4').removeClass('rmpHide');
                }
                Ember.$("#tablerowradio").addClass("rmpHide");
                Ember.$("#Authenticationrow").addClass("rmpHide");
                Ember.$('#tablerow2').removeClass('rmpHide');
                Ember.$("#alertIcon1").removeClass("rmpHide");
                Ember.$("#userName").attr("placeholder", jsRb['rmp.login.admin']);
            }

        },
        populateenvironmentFilter: function() {
            var Dobject = {
                operation: "populateVirtualEnvironmentDropdown",
                requestpage: "vconfiguration"
            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=populateVirtualEnvironmentDropdown'; //NO I18N
            var objects = serverReq(apiUrl, Dobject, false);
            var dropdown = {
                class: "adsblockElement",
                span: objects.virtualenvironments
                /*
                span: [{
                    id: "1_VMware_Filter",
                    value: "VMware"
                }, {
                    id: "2_Hyper-V_Filter",
                    value: "Hyper-V"
                }]
                */
            };
            var selectedId = objects.defaultenvironment.id;
            this.set("selectedenvironmentfilter", selectedId.charAt(0));
            var data = {
                dropdownId: "environmentFilterId",
                selectAction: "environmentFilterselectAction",
                selectedValue: objects.defaultenvironment.value,
                dropdown: dropdown,
                id: "environmentFilterselect",
                spanId: "environmentFilterslide",
                spanClass: "adsflLeft leftads adsblockElement adsblackFnt",
                divClass: "adsflLeft deselectComponent adspositionRelative dropdown commondropdown adsfntSize",
                dropdownClass: "adsblockElement marginLeftRight",
                dropdownSlideClass: "adsblockElement dropdownSlide dropdownhover uihide",
                dropdownSlideStyle: "width:100%;",
                dropdownStyle: "outline:0;width:140px;height:100%"
            };
            Mapper.getCell("environmentFilter").setData(data);
        },
        environmentFilterselectAction: function(type, id, value) {
            var environmentType = id.charAt(0);
            this.set("selectedenvironmentfilter", environmentType);
            if(!Ember.$("#vmDiv").hasClass("rmpHide")){
                this.send("resetvmViewInputServerid");
            }
            else{
                this.set("serverrangestart", 1);
                this.set("limit", 10);
                this.send("serverViewInput");
            }
        },
        bringfrontselecthostpopup: function(objects) {
            Freezer.on();
            var firstrowdivbox = {
                "name": "firstrowdiv",
                "dim": [0, 0, 24, 155],
                "fixed": [true, true],
                "comp": {
                    "attributes": [{
                        "type": "style",
                        "value": "widtCh:auto;height:auto;position:relative;"
                    }]
                }
            };
            var firstrowinsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(firstrowdivbox)
            }];

            var tablebox = {
                "name": "hostlisttable",
                "dim": [0, 0, 800, 227],
                "fixed": [true, true],
                "comp": {
                    "type": "dynamic",
                    "name": "ui-table",
                    "data": true,
                    "attributes": [{
                        "type": "style",
                        "value": "position:relative;max-height:250px;overflow-y:auto;height:auto;"
                    }]
                },
                "actions": [{
                    "type": "didInsertElement",
                    "method": "populatehostlisttable",
                    "params": objects
                }]
            };
            var tableboxinsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(tablebox)
            }];
            var tr = [{
                id: "",
                class: "adspopUpTopBand adsblackFnt adspadding5",
                th: [{
                    id: "",
                    colspan: "4",
                    class: "",
                    rowValue: [{
                        style: "font-weight:bold;",
                        value: "Select Hosts",
                        class: "adsflLeft adsblackFnt"
                    }, {
                        id: "selectvmpopupclose",
                        value: "",
                        class: "adsflRight adspopupDivClose",
                        divAction: "closeselecthostpopup"
                    }]
                }]
            }, {
                id: "tablerow1",
                class: "adsmargin10",
                style: "height:20px;",
                th: [{
                    id: "",
                    colspan: "3",
                    style: "height:20px",
                    class: "transperantBorder",
                    rowValue: firstrowinsert
                }]
            }, {
                id: "trow2",
                class: "adsmargin10",
                style: "height:250px;",
                th: [{
                    id: "",
                    colspan: "4",
                    class: "transperantBorder",
                    style: "padding-left:10px;height:250px;",
                    rowValue: tableboxinsert
                }]
            }];
            var vmList = {
                id: "",
                class: "adsmargin10",
                th: [{
                    id: "left1",
                    value: "",
                    colspan: "1"
                }, {
                    id: "addvmlist",
                    colspan: "3",
                    class: "adsinlineAndBlock adsflLeft adsValignTop msg",
                    style: "padding-left:35%;",
                    rowValue: [{
                        id: "selecthostpopupok",
                        divAction: "closeselecthostpopup",
                        value: "Ok",
                        class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButton"
                    }]
                }]
            };
            tr.push(vmList);
            var tableRow = {
                id: "selecthostpopupbody",
                class: "popup adsfntFamily adsfntSize adsgrayfont",
                style: "width:500px;height:370px;margin-left:-350px;margin-top: 20px;",
                tbody: {
                    id: "",
                    class: "",
                    tr: tr
                }
            };
            var data = {
                row: tableRow
            };
            Mapper.getCell("selecthostpopup").setData(data);
            //
            Ember.$("#selecthostpopup").removeClass("rmpHide");
            Ember.$("#firstrowdiv").removeClass("rmpHide");
        },
        populatehostlisttable: function(objects) {
            Mapper.getCell("hostlisttable").deleteData();
            var mr = [];
            var hostList = {};
            var hostdetails = objects;
            var hosts = hostdetails.hosts;
            var count = hosts.length;
            var bufferhosts = this.get("bufferhosts");
            var thosts = bufferhosts.hosts;
            hostList = {
                id: "",
                class: "tableHeader",
                style: "height:20px;",
                th: [{
                    id: "",
                    style: "width:1%;",
                    rowValue: [{
                        id: "checkallvms",
                        divAction: "",
                        class: "adsmargin3 adsflRight",
                        value: ""
                    }]
                }, 
                // {
                //     id: "",
                //     style: "width:5%;",
                //     rowValue: [{
                //         id: "",
                //         class: "truncate",
                //         style: "padding-left:5px;",
                //         value: "Action"
                //     }]
                // },
                {
                    id: "",
                    style: "width:10%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        value: "Host Name"
                    }]
                }, {
                    id: "",
                    style: "width:10%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        value: "Agent Status"
                    }]
                }, {
                    id: "",
                    style: "width:50%;",
                    rowValue: [{
                        id: "",
                        class: "adsinlineAndBlock truncate",
                        style: "padding-left:5px;",
                        value: "Credentials"
                    },{
                        id: "authenticatioInfo",// No I18N
                        class: "adsinlineAndBlock truncate adsflRight small-info",// No I18N
                        style: "position:relative;left:-340px;top:1px;",// No I18N
                        value: "",// No I18N
                        title: jsRb['rmp.virtual.vconfiguration.authentication_message'],
                        divAction: ""// No I18N
                    }]
                }]
            };
            mr.push(hostList);

            var dontcheckallflag = true;
            var selectedinthispage = 0;

            if (hosts.length != 0) {
                for (var i = 0; i < hosts.length; i++) {
                    var obj = hosts[i];
                    var hoststatus = "false";
                    var parentserverid = obj.server_id;
                    var hostid = obj.v_sphere_host_id;
                    var hostname = obj.host_name;
                    var hostusername = "";
                    var hostpassword = obj.password;
                    var isconfigured = obj.configurationstatus;
                    var checkedornot = "unchecked";
                    var disableDiv=" disableDiv";
                    var iconDisableDiv=" disableDiv";
                    var enableDisableIcon = "disableIcon";
                    var buttonHide = "";
                    var statusHide = " rmpHide";
                    //for credentials column
                    // var credentialsID = "updatehost";
                    // var credentialsAction = "saveserverchanges";
                    // var credentialsIcon = "plusIcon disableDiv";
                    // var credentialsStyle = "position:relative;left:360px;";
                    var saveIconClass = "rmpHide";
                    var editIconClass = "rmpHide";
                    var unConfigureIconClass = "rmpHide";
                    var authBtnDisable = " disableDiv";
                    var authBtn = " offBtn";
                    var authBtnHide = "";
                    var usernameTextHide = "rmpHide";
                    var warningIconClass = " rmpHide";
                    var installBtnText = "Install";
                    var statusText = "Installed";
                    var statusTitle = "";
                    var loadingHide = " rmpHide";
                    var authButnPosition = "top:5px;"
                    //if(isconfigured || hostusername!=""){ //if not configured obtain the credentials 
                    if(isconfigured == 1){
                        //status_configured
                        checkedornot = "checked";
                        iconDisableDiv="";
                        buttonHide = " rmpHide";
                        authBtnHide = " rmpHide";
                        statusHide = "";
                        unConfigureIconClass = "";
                        editIconClass = "";
                        authButnPosition = "top:17px;"
                        hostusername = decodeURIComponent(obj.username);
                        if(hostusername != "-"){
                            authBtn = " onBtn";
                            usernameTextHide = "";
                        }
                    }
                    else if(isconfigured == 2){
                        //status_installing
                        buttonHide = " rmpHide";
                        checkedornot = "checked";
                        statusHide = "";
                        iconDisableDiv="";
                        statusText = "Installing...";
                        statusTitle = "";
                        loadingHide = ""; 
                        hostusername = decodeURIComponent(obj.username);
                        if(hostusername != "-"){
                            authBtn = " onBtn";
                        }
                    }
                    else if(isconfigured == 3){
                        //status_failed
                        warningIconClass = "";
                        checkedornot = "checked";
                        statusHide = "";
                        iconDisableDiv="";
                        authBtnDisable="";
                        installBtnText = "Retry";
                        statusText = obj.errordetails.substring(0,6) + "...";
                        statusTitle = obj.errordetails;
                    }

                    //
                    if(hostusername == "-"){
                        hostusername = ""; //Setting username to empty value if default auth is used
                    } 
                    //
                    //disableDiv="";
                    var userinsert = "", passinsert="", userinsertText="", passinsertText="";
                    //if(isconfigured ==1 && hostusername != "-")
                    if(isconfigured ==1)
                    {
                         var userbox = {
                                  "name": "userName" + hostid,
                                  "dim": [40, 12, 163, 12],
                                  fixed: [true, true],
                                  "comp": {
                                      "name": "input",
                                      "type": "HTML",
                                      "attributes": [{
                                          "type": "type",
                                          "value": "text"
                                      }, {
                                          "type": "placeholder",
                                          "value": "host or domain\\username"
                                      }, {
                                          "type": "style",
                                          "value": "position:relative !important"
                                      }, {
                                          "type": "value",
                                          "value": hostusername
                                      }]
                                  },
                                  "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize","rmpHide"],
                                  "actions": [{
                                      "type": "",
                                      "method": ""
                                  }]
                              };
                    var passwordbox = {
                                  "name": "passName" + hostid,
                                  "dim": [217, 0, 163, 12],
                                  fixed: [true, true],
                                  "comp": {
                                      "name": "input",
                                      "type": "HTML",
                                      "attributes": [{
                                          "type": "type",
                                          "value": "password"
                                      }, {
                                          "type": "placeholder",
                                          "value": "password"
                                      }, {
                                          "type": "style",
                                          "value": "position:relative !important"
                                      }, {
                                          "type": "value",
                                          "value": hostpassword
                                      }]
                                  },
                                  "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize", "rmpHide"],
                                  "actions": [{
                                      "type": "",
                                      "method": ""
                                  }]
                              };
                    }
                    else{
                        var userbox = {
                                  "name": "userName" + hostid,
                                  "dim": [40, 0, 163, 12],
                                  fixed: [true, true],
                                  "comp": {
                                      "name": "input",
                                      "type": "HTML",
                                      "attributes": [{
                                          "type": "type",
                                          "value": "text"
                                      }, {
                                          "type": "placeholder",
                                          "value": "host or domain\\username"
                                      }, {
                                          "type": "style",
                                          "value": "position:relative !important"
                                      }, {
                                          "type": "value",
                                          "value": hostusername
                                      }]
                                  },
                                  "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize", "disableDiv"],
                                  "actions": [{
                                      "type": "",
                                      "method": ""
                                  }]
                              };
                    var passwordbox = {
                                  "name": "passName" + hostid,
                                  "dim": [217, -12, 163, 12],
                                  fixed: [true, true],
                                  "comp": {
                                      "name": "input",
                                      "type": "HTML",
                                      "attributes": [{
                                          "type": "type",
                                          "value": "password"
                                      }, {
                                          "type": "placeholder",
                                          "value": "password"
                                      }, {
                                          "type": "style",
                                          "value": "position:relative !important"
                                      }, {
                                          "type": "value",
                                          "value": hostpassword
                                      }]
                                  },
                                  "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize", "disableDiv"],
                                  "actions": [{
                                      "type": "",
                                      "method": ""
                                  }]
                              };
                    }
                    var userinsert = {
                            id: "",
                            uiFramework: true,
                            compData: JSON.stringify(userbox)
                        };
                    var passinsert = {
                        id: "",
                        uiFramework: true,
                        compData: JSON.stringify(passwordbox)
                    };   


                    


                    //for showing UserName: nameOfUser
                    userinsertText = {  id:"userNameColon" + hostid,
                                        value:"UserName:",
                                        style:"position:relative;top:-10px;left:40px;",
                                        class:"adsfntSize adsinlineAndBlock  adsfntFamily " + usernameTextHide
                                     };
                    passinsertText = {id:"userNameValue" + hostid,
                                         value:hostusername,
                                         style:"position:relative;top:-10px;left:40px",
                                         class:"adsfntSize adsinlineAndBlock adsfntFamily " + usernameTextHide
                                      };
                    
                    

                    hostList = {
                        id: "",
                        class: "",
                        style: "height:47px;background:#E8E8E8",
                        th: [{
                            id: "",
                            style: "width:1%;",
                            class: "whiteBg",
                            rowValue: [{
                                id: "check" + parentserverid + "_" + hostid,
                                divAction: "checkthishost",
                                class: "ico14x14 adsmargin3 adsflRight checkall " + checkedornot,
                                value: ""
                            }]
                        },
                        //  {
                        //     id: "",
                        //     class: "whiteBg",
                        //     rowValue: [{
                        //         id: "edit_" + hostid,
                        //         class: "truncate adsflLeft editIcon"+ iconDisableDiv,
                        //         style: "margin-top:5px",
                        //         title: "Edit Configuration",
                        //         value: "",
                        //         divAction: "edithostpopupfill"
                        //     },
                        //     //  {
                        //     //     id: "hostref_" + hostid,
                        //     //     class: "truncate adsflLeft refreshIcon"+ iconDisableDiv,
                        //     //     style: "margin-top:5px;padding-bottom:2px",
                        //     //     title: "Refresh Configuration",
                        //     //     value: "",
                        //     //     divAction: "refreshConfiguration"
                        //     // }
                        //     ]
                        // },
                         {
                            id: "",
                            style: "width:25%;",
                            class: "whiteBg",
                            rowValue: [{
                                id: "hostname" + hostid,
                                class: "truncate",
                                style: "padding-left:5px;",
                                value: hostname
                            }]
                        }, {
                            id: "",
                            style: "width:15%;",
                            class: "whiteBg",
                            rowValue: [{
                                id: "erroricon" + hostid,
                                divAction: "",
                                value: "",
                                class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adswarningIcon" + warningIconClass,
                                style: "padding-left:0px;"                               
                            },
                            {
                                id: "loadinggif" + hostid,
                                divAction: "",
                                value: "",
                                class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent smallloading_gif" + loadingHide,
                                style: "padding-left:0px;"                               
                            },{
                                id: "configurestatus" + hostid,
                                class: "truncate adsinlineAndBlock " + statusHide,
                                style: "padding-left:5px; padding-top:5px;",
                                title: statusTitle,
                                value: statusText
                            },{
                                id: "configurescvmmchildhost" + hostid,
                                divAction: "addserver",
                                title: "Install Agent",
                                value: installBtnText,
                                class: "adsinlineAndBlock adswhiteSpace linkcolor cursorPointer adsmargin5 deselectComponent" + iconDisableDiv + buttonHide,
                                style: "padding-left:0px;"                               
                            },{
                                id: "icon_check" + parentserverid + "_" + hostid,
                                title: "Uninstall",
                                divAction: "unconfigurethishost",
                                style: "position:relative;top:-2px;",
                                class: "adswhiteSpace  cursorPointer adsinlineAndBlock adsmargin5 uninstallServer " + unConfigureIconClass
                            }
                            ]
                        }, {
                            id: "",
                            style: "width:25%;height:auto;",
                            class: "whiteBg",
                            rowValue: [{
                                id: "isLogonAuth" + hostid,
                                class: "adsinlineAndBlock cursorPointer adsflRight" + authBtnDisable + authBtn + authBtnHide,
                                value: "",
                                title: jsRb['rmp.virtual.vrepository.isLocal_title'],
                                style: "position:relative;left:-397px;" + authButnPosition,
                                divAction: "toggleCredentialsSelectHostpopup"
                            },
                            userinsert,passinsert,userinsertText,passinsertText,
                            {
                                id: "updatehost" + hostid,
                                divAction: "saveserverchanges",
                                value: "",
                                class: "adsinlineAndBlock adswhiteSpace adsmargin5 cursorPointer saveIcon " + saveIconClass,
                                style: "position:relative;left:393px;top:-10px;"                               
                            },{
                                id: "edit_" + hostid,
                                title: "Edit Credentials",
                                divAction: "editHostOfScvmm",
                                value: "",
                                class: "adsinlineAndBlock adswhiteSpace adsmargin5 editIcon " + editIconClass,
                                style: "left:40px;top:-8px;position:relative;"                               
                            }
                            ]
                        }]
                    };
                    mr.push(hostList);
                }
            } else {
                var not_available = {
                    id: "",
                    class: "whiteBg",
                    style: "height:20px;",
                    th: [{
                        id: "",
                        style: "",
                        colspan: 4,
                        rowValue: [{
                            id: "",
                            class: "truncate",
                            style: "margin-left:35%",
                            i18nText: false,
                            value: "No Host Configured"
                        }]
                    }]
                };
                mr.push(not_available);
            }
            var tableRow = {
                id: "hosttablelistbody",
                class: "adsfntFamily adsfntSize adsgrayfont tableOuter",
                style: "width:100%;position:relative;margin-bottom:5px;margin-top:2px;border-spacing:1px;",
                tbody: {
                    id: "",
                    class: "",
                    tr: mr
                }
            };
            var data = {
                row: tableRow
            };
            Ember.run.schedule("afterRender", this, function() {
                Mapper.getCell("hostlisttable").setData(data); //No I18N

            });
            Ember.run.schedule("afterRender", this, function() {
                if (selectedinthispage == hosts.length) {
                    Ember.$("#checkallvms").addClass("checked");
                    Ember.$("#checkallvms").removeClass("unchecked");
                }
            });
        },
        unconfigurethishost: function(id){
            var iconid = id.substring(5,id.length);
            this.send("deleteServer",iconid);
        },
        editHostOfScvmm: function(id){
            id = id.substring(5,id.length);
                Ember.$("#isLogonAuth" + id).removeClass("disableDiv");
                Ember.$("#isLogonAuth" + id).removeClass("rmpHide");
                Ember.$('#userName' + id).removeClass('rmpHide');
                Ember.$('#passName' + id).removeClass('rmpHide');
                Ember.$('#updatehost' + id).removeClass('rmpHide');
                Ember.$('#updatehost' + id).removeClass('disableDiv');
                Ember.$('#userNameColon' + id).addClass('rmpHide');
                Ember.$('#userNameValue' + id).addClass('rmpHide');
                Ember.$('#edit_' + id).addClass('rmpHide');
                if(!Ember.$('#isLogonAuth' + id).hasClass('onBtn')){
                    Ember.$('#userName' + id).addClass('disableDiv');
                    Ember.$('#passName' + id).addClass('disableDiv');
                }
                else{
                    Ember.$('#userName' + id).removeClass('disableDiv');
                    Ember.$('#passName' + id).removeClass('disableDiv');
                }
        },
        closeselecthostpopup: function() {
            var askconfirm = false;
            Ember.$("div.checkall").each(function() {
                var id = Ember.$(this).attr('id');
                var hostid = id.substring(id.lastIndexOf('_')+1, id.length);
                var buttonHide = Ember.$("#configurescvmmchildhost"+hostid).hasClass('rmpHide');
                if(Ember.$("#"+id).hasClass("checked")){
                    if(!buttonHide){
                        if(Ember.$("#configurescvmmchildhost"+hostid).text()=="Install"){
                            askconfirm = true;
                        }
                    }
                }
                //if (Ember.$("#"+id).hasClass("checked") && !(Ember.$("#configurescvmmchildhost"+hostid).hasClass("rmpHide")) && Ember.$("#configurescvmmchildhost"+hostid).text()!="Retry") {
                    //askconfirm = true;
                //}
            });

            if(askconfirm){
                this.send("confirmcloseselecthostpopup");
            }
            else{
                this.send("finishcloseselecthostpopup");
            }
        },
        finishcloseselecthostpopup: function(){
            if(!Ember.$("#confirmclosepopup").hasClass('rmpHide')){
                Freezer.sendBack();
                Ember.$("#confirmclosepopup").addClass('rmpHide');
            }
            Mapper.getCell('selecthostpopup').deleteData();
            Ember.$("#selecthostpopup").toggleClass('rmpHide');
            Freezer.off();
            if(!Ember.$("#addserverDiv").hasClass("rmpHide")){
                this.send("setFilterdropdownFromnew");
            }
            this.send('buttonActions', 'cancel'); 
        },
        confirmpopupyes: function(){
            Ember.$("#confirmclosepopup").addClass('rmpHide');
            this.send("finishcloseselecthostpopup");
        },
        hideconfirmpopup: function(){
            Freezer.sendBack();
            Ember.$("#confirmclosepopup").addClass('rmpHide');
        },
        confirmcloseselecthostpopup: function(){
            Freezer.on();
            Mapper.getCell('confirmclosepopup').deleteData();
            var tr = [{
                id: "",
                class: "adspopUpTopBand adsblackFnt adspadding5",
                th: [{
                    id: "",
                    colspan: "2",
                    class: "",
                    rowValue: [{
                        style: "font-weight:bold;",
                        value: jsRb['rmp.virtual.vconfiguration.close_popup'],
                        class: "adsflLeft adsblackFnt"
                    }, {
                        id: "closeornotid",
                        value: "",
                        class: "adsflRight adspopupDivClose",
                        divAction: "hideconfirmpopup"
                    }]
                }]
            }, {
                id: "",
                class: "adsmargin10",
                th: [{
                    id: "",
                    colspan: "2",
                    class: "adsinlineAndBlock adsflLeft adspadding5",
                    rowValue: [{
                        style: "",
                        class: "adsconfirmIcon"
                    }]
                }, {
                    id: "",
                    colspan: "2",
                    class: "adsinlineAndBlock adsflLeft adsValignTop msg",
                    rowValue: [{
                        style: "",
                        value: jsRb['rmp.virtual.vconfiguration.confirm_close_selecthosts'],
                        class: "adsblockElement adsfontSize11 paddingTopBtm"
                    },
                    {
                        id: "yesclosepopup",
                        divAction: "finishcloseselecthostpopup",
                        i18nText: true,
                        value: "rmp.common.Yes",
                        class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButton"
                    }, {
                        divAction: "hideconfirmpopup",
                        i18nText: true,
                        value: "rmp.common.No",
                        class: "adsinlineAndBlock adsgrayButton adswhiteSpace adsmargin5 deselectComponent"
                    }]
                }]
            }];
            var tableRow = {
                id: "disableornotpopupbody",
                class: "popup popupAlert adsfntFamily adsfntSize adsgrayfont",
                style: "",
                tbody: {
                    id: "",
                    class: "",
                    tr: tr
                }
            };
            var data = {
                row: tableRow
            };
            Mapper.getCell('confirmclosepopup').setData(data);
            Ember.$("#confirmclosepopup").toggleClass('rmpHide');
        },
        edithostpopupfill: function(id){
            var hostid = id.substring(5, id.length);
            Ember.$("#userName"+hostid).removeClass('disableDiv');
            Ember.$("#passName"+hostid).removeClass('disableDiv');
            Ember.$("#updatehost"+hostid).removeClass('disableDiv');
        },
        toggleCredentialsSelectHostpopup: function(id){
            var hostid = id.substring(11,id.length);
            if(Ember.$("#isLogonAuth"+hostid).hasClass('offBtn'))
            {
                Ember.$("#isLogonAuth"+hostid).removeClass('offBtn').addClass('onBtn');
                Ember.$("#userName"+hostid).removeClass('disableDiv');
                Ember.$("#passName"+hostid).removeClass('disableDiv');
            }
            else
            {
                Ember.$("#isLogonAuth"+hostid).removeClass('onBtn').addClass('offBtn');
                Ember.$("#userName"+hostid).addClass('disableDiv');
                Ember.$("#passName"+hostid).addClass('disableDiv');
            }
        },
        checkthishost: function(id){
            var combinedId = id.substring(5, id.length);
            var idarr = combinedId.split("_");
            var parentserverid = idarr[0];
            var hostid = idarr[1];
            if (Ember.$("#" + id).hasClass("unchecked")){
                Ember.$("#isLogonAuth"+hostid).removeClass('disableDiv');
                if(Ember.$("#isLogonAuth"+hostid).hasClass('onBtn'))
                {
                Ember.$("#userName"+hostid).removeClass('disableDiv');
                Ember.$("#passName"+hostid).removeClass('disableDiv');
                }
                Ember.$("#edit_"+hostid).removeClass('disableDiv');
                Ember.$("#updatehost"+hostid).removeClass('disableDiv');
                //Ember.$("#hostref_"+hostid).removeClass('disableDiv');
                Ember.$("#configurescvmmchildhost"+hostid).removeClass('disableDiv');
            } else if (Ember.$("#" + id).hasClass("checked")){
                if(Ember.$("#configurescvmmchildhost"+hostid).hasClass('rmpHide')){
                    this.send("deleteServer",id); 
                }
                else{
                Ember.$("#isLogonAuth"+hostid).addClass('disableDiv');
                Ember.$("#userName"+hostid).addClass('disableDiv');
                Ember.$("#passName"+hostid).addClass('disableDiv');
                Ember.$("#edit_"+hostid).addClass('disableDiv');
                Ember.$("#updatehost"+hostid).addClass('disableDiv');
                //Ember.$("#hostref_"+hostid).addClass('disableDiv');
                Ember.$("#configurescvmmchildhost"+hostid).addClass('disableDiv');
                }
            }
            
                Ember.$("#" + id).toggleClass("unchecked");
                Ember.$("#" + id).toggleClass("checked");
        },
        setFilterdropdownFromnew: function(){
            var environment = this.get("selectedenvironment");
            var selectedtext = Ember.$("#environmentNameselect").text();
            Ember.$("#environmentFilterselect").text(selectedtext);
            this.set("selectedenvironmentfilter",environment);
        },
        setnewdropdownFromFilter: function(){
            var environmentFilter = this.get("selectedenvironmentfilter");
            var selectedtext = Ember.$("#environmentFilterselect").text();
            Ember.$("#environmentNameselect").text(selectedtext);
            this.set("selectedenvironment",environmentFilter);
            this.send("environmentNameSelectHelper",environmentFilter);
        },
        addServerBtn: function() {
            //    alert(JSON.parse(this.get("apple")));
            this.send("setnewdropdownFromFilter");
            Ember.$('#addserverDiv').toggleClass('rmpHide');
            Ember.$('#serverDiv').addClass('rmpHide');
            Ember.$('#addServer-btn').toggleClass('rmpHide');
            Ember.$('#licenseMgmt-btn').toggleClass('rmpHide');
            Ember.$('#environment-label').toggleClass('rmpHide');
            Ember.$('#environmentFilter').toggleClass('rmpHide');
        },
        serverSelect: function(servertype, id) {
            var serverid = id.substring(5, id.length);
            this.set("vmViewrangestart", 1);
            this.set("limit", 10);
            this.set("selectedserverid", serverid);
            this.set("selectedservertype", servertype);
            var rangestart = this.get("vmViewrangestart");
            var limit = this.get("limit");
            var Dobject = {
                operation: "getVMList",
                operationtype:"list",
                serverdetails: {
                    serverid: serverid,
                    rangestart: this.get("vmViewrangestart"),
                    limit: this.get("limit"),
                    type: servertype,
                    listAll: false
                },
            includeunlicensedhosts:true

            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=getVMList'; //NO I18N
            var objects = serverReq(apiUrl, Dobject, false);
            var vmdetails = objects;
            var vmcount = vmdetails.vmcount;
            var vms = vmdetails.vms;
            if(objects.hasOwnProperty("errorCode")){
                vms = [];
            }
            this.set("vmViewvmcount", vmcount);
            if (rangestart + limit > vmcount) {
                this.set("limit", vmcount - rangestart + 1);
            }
            this.send("populatevmview", vms);
        },
        vmViewBackwarAction: function() {
            var rangestart = this.get("vmViewrangestart");
            this.set("limit", 10);
            var limit = this.get("limit");
            var totalcount = this.get("vmViewvmcount");
            this.set("vmViewrangestart", rangestart - limit);
            var Dobject = {
                operation: "getVMList",
                operationtype:"list",
                serverdetails: {
                    serverid: this.get("selectedserverid"),
                    rangestart: this.get("vmViewrangestart"),
                    limit: this.get("limit"),
                    type: this.get("selectedservertype"),
                    listAll: false
                },
            includeunlicensedhosts:true

            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=getVMList'; //NO I18N
            var objects = serverReq(apiUrl, Dobject, false);
            var vmdetails = objects;
            var vms = vmdetails.vms;
            if(objects.hasOwnProperty("errorCode")){
                vms = [];
            }
            //alert(vms);
            this.send("populatevmview", vms);
        },
        vmViewForwardAction: function() {
            this.set("vmViewrangestart", this.get("vmViewrangestart") + this.get("limit"));
            var rangestart = this.get("vmViewrangestart");
            var limit = this.get("limit");
            var totalcount = this.get("vmViewvmcount");
            if (rangestart + limit > totalcount) {
                this.set("limit", totalcount - rangestart + 1);
            }
            var Dobject = {
                operation: "getVMList",
                operationtype:"list",
                serverdetails: {
                    serverid: this.get("selectedserverid"),
                    rangestart: this.get("vmViewrangestart"),
                    limit: this.get("limit"),
                    type: this.get("selectedservertype"),
                    listAll: false
                },
            includeunlicensedhosts:true

            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=getVMList'; //NO I18N
            var objects = serverReq(apiUrl, Dobject, false);
            var vmdetails = objects;
            var vms = vmdetails.vms;
            if(objects.hasOwnProperty("errorCode")){
                vms = [];
            }
            //alert(vms);
            this.send("populatevmview", vms);
        },
        populatevmview: function(vms) {
            var rangestart = this.get("vmViewrangestart");
            var limit = this.get("limit");
            var totalcount = this.get("vmViewvmcount");
            if (rangestart + limit > totalcount) {
                var navRight = "navRight disableDiv";
                //alert("nomore");
            } else {
                var navRight = "navRight";
            }
            if ((rangestart - limit < 1) || limit==0){
                var navLeft = "navLeft disableDiv ";
            } else {
                var navLeft = "navLeft";
            }

            if (totalcount == 0) {
                rangestart = 0;
            }

            Mapper.getCell('vmView').deleteData();
            var vmList = {};
            var tr = [{
                id: "tr1",
                style: "height:25px",
                th: [{
                    id: "",
                    colspan: "4",
                    style: "",
                    rowValue: [{
                        id: "vmViewForward",
                        class: " adsflRight cursorPointer " + navRight,
                        divAction: "vmViewForwardAction"
                    }, {
                        id: "technicianBackward",
                        class: " adsflRight cursorPointer " + navLeft,
                        divAction: "vmViewBackwarAction"
                    }, {
                        class: "adsflRight",
                        value: (rangestart) + " - " + (this.get("limit") + this.get("vmViewrangestart") - 1) + " of " + this.get("vmViewvmcount")
                    }]
                }]
            }, {
                id: "th1",
                class: "tableHeader",
                th: [{
                    id: "action",
                    class: "w10",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        value: jsRb['rmp.virtual.vconfiguration.vm_name']
                    }]
                }, {
                    id: "server",
                    style: "width:15%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        i18nText: true,
                        value: "rmp.virtual.vconfiguration.usedsize"
                    }]
                }, {
                    id: "user",
                    style: "width:25%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        i18nText: true,
                        value: "rmp.virtual.vconfiguration.provisionedsize"
                    }]
                }, {
                    id: "status",
                    style: "width:25%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        i18nText: true,
                        value: "rmp.virtual.vconfiguration.host"
                    }]
                }]
            }];
            if (vms.length > 0) {
                for (var i = 0; i < vms.length; i++) {
                    var obj = vms[i];
                    var vmid = obj.vmid;
                    var vmname = obj.vmname;
                    var usedsize = obj.usedsize;
                    var provisionedsize = obj.provisionedsize;
                    var hostname = obj.hostname;
                    vmList = {
                        id: "_row" + vmid,
                        class: "whiteBg border_bottom onhoverparent",
                        style: "height:25px;",
                        th: [{
                            id: "",
                            style: "width:25%;",
                            rowValue: [{
                                id: "",
                                class: "truncate vmIcon adsflLeft",
                                value: ""
                            }, {
                                id: "_vmname" + vmid,
                                style: "padding-left:5px;display:inline-block;max-width:90%",
                                class: "truncate",
                                title:vmname,
                                value: vmname
                            }]
                        }, {
                            id: "",
                            style: "width:25%;",
                            rowValue: [{
                                id: "",
                                style: "padding-left:5px;",
                                class: "truncate",
                                value: usedsize.toFixed(2) + " GB"
                            }]
                        }, {
                            id: "",
                            style: "width:25%;",
                            rowValue: [{
                                id: "",
                                style: "padding-left:5px;",
                                class: "truncate",
                                value: provisionedsize.toFixed(2) + " GB"
                            }]
                        }, {
                                id: "",
                                style: "width:25%;",
                                rowValue: [{
                                    id: "",
                                    style: "padding-left:5px;",
                                    class: "truncate adsinlineAndBlock",
                                    value: hostname
                                }, {
                                    id: "qrestore" + vmid,
                                    class: "truncate adsflRight adsinlineAndBlock linkcolor cursorPointer onhoverchild",
                                    style: "margin-right:10px",
                                    value: "Restore",
                                    title: "Easy Restore",

                                    divAction: "showquickRestore"
                                }, {
                                    id: "",
                                    style: "margin-right:10px;color:#005ebb",
                                    class: "truncate adsflRight adsinlineAndBlock onhoverchild",
                                    value: "|"
                                }, {
                                    id: "qbackup" + vmid,
                                    style: "margin-right:10px",
                                    class: "truncate adsflRight adsinlineAndBlock linkcolor cursorPointer onhoverchild",
                                    value: "Backup",
                                    title: "Easy Backup",

                                    divAction: "showquickBackup"
                                }]
                            }]
                    };
                    tr.push(vmList);
                }
            } else {
                vmList = {
                    id: "",
                    class: "whiteBg border_bottom",
                    style: "height:100px;",
                    th: [{
                        id: "",
                        class: "",
                        colspan: "4",
                        rowValue: [{
                            style: "text-align:center;",
                            i18nText: true,
                            value: "rmp.admin.technicians.no_data_available"
                        }]
                    }]
                };
                tr.push(vmList);
            }
            var tableRow = {
                id: "vmtable",
                style: "width:100%;border: 1px solid;border-color:#e8e8e8;",
                class: "tableOuter rmptableRow",
                cellspacing: "0",
                tbody: {
                    id: "",
                    class: "",
                    tr: tr
                }
            };
            var data = {
                row: tableRow
            };
            Mapper.getCell('vmView').setData(data);
        },
        resetvmViewInputServerid: function(){
            var Dobject = {
                "operation": "getServers",
                "serverids": [],
                "limit": this.get("limit"),
                "rangestart": this.get("serverrangestart"),
                "virtualEnvironment": this.get("selectedenvironmentfilter")
            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=getServers'; //NO I18N
            var objects = serverReq(apiUrl, Dobject, false);
            var serverdetails = objects;
            var servers = serverdetails.serverdetails.servers;
            var id;
            if (servers.length > 0) {
                var obj = servers[0];
                var serverid = obj.serverid;
                var type = obj.type;
                id = type + "_vmcount" + serverid;
            }
            else{
                id = "2_vmcount0";
            }
            this.send("vmViewInput",id);
        },
        
        quickrestorepointselector: function(type, id, value) {

                this.set("selectedquickrestorepoint", id);

         },
        SelectRepository: function(type, id, value) {
                var repositoryid = id.substring(7, id.length);
                this.set("selectedrepository", repositoryid);
         },
        populatestoragedropdown: function() {
            var virtualEnvironment = this.get("selectedenvironmentfilter");
                var Dobject = {
                    "operation": "populateStorageDropdown",
                    "virtualEnvironment": virtualEnvironment,
                    "repositoryids": []
                };
                var apiUrl = '/virtualBackup.do?methodToCall=populateStorageDropdown'; //NO I18N
                var objects = serverReq(apiUrl, Dobject, false);
                //var repository=objects.repository;
                if (objects.repository.length > 0) {
                    var dropdown = {
                        class: "adsblockElement",
                        span: objects.repository
                    };
                    var selectedId = objects.repository[0].id;
                    this.set("selectedrepository", selectedId.substring(7, selectedId.length));
                    var data = {
                        dropdownId: "storagedropdownId",
                        selectAction: "SelectRepository",
                        selectedValue: objects.repository[0].value,
                        dropdown: dropdown,
                        id: "storageSelect",
                        spanId: "storageSlide",
                        spanStyle: "max-width:190px;",
                        spanClass: "adsflLeft leftads adsinlineAndBlock adsblackFnt truncate",
                        divClass: "adsflLeft deselectComponent adspositionRelative dropdown commondropdown adsfntSize",
                        dropdownClass: "adsblockElement marginLeftRight ",
                        dropdownSlideClass: "adsblockElement dropdownSlide dropdownhover uihide",
                        dropdownSlideStyle: "width:99%;",
                        dropdownStyle: "width:220px;height:100%"
                    };
                } else {

                    this.set("selectedrepository", 0);

                    var dropdown = {
                        class: "adsblockElement",
                        span: []
                    };
                    var data = {
                        dropdownId: "storagedropdownId",
                        selectAction: "SelectRepository",
                        selectedValue: "No Repositories found",
                        dropdown: dropdown,
                        id: "storageSelect",
                        spanId: "storageSlide",
                        spanStyle: "max-width:190px;",
                        spanClass: "adsflLeft leftads adsinlineAndBlock adsblackFnt truncate",
                        divClass: "adsflLeft deselectComponent adspositionRelative dropdown commondropdown adsfntSize disableDiv",
                        dropdownClass: "adsblockElement marginLeftRight ",
                        dropdownSlideClass: "adsblockElement dropdownSlide dropdownhover uihide",
                        dropdownSlideStyle: "width:99%;",
                        dropdownStyle: "width:220px;height:100%"
                    }
                }

                Ember.run.schedule("afterRender", this, function() {
                    Mapper.getCell("storagedropdown").setData(data);
                });
            },
            populatequickrestorepoints: function(paramArray) { //[vmDetails,vmid]

                var vmDetails = paramArray[0];
                var vmid = paramArray[1];
                var vmCount = vmDetails.length;
                var selectedValue = "-Select Restore Point-";
                var dropdownData = {};
                var dropdown = {};
                var found = false;

                for (i = 0; i < vmCount; i++) {
                    var retrievedvmid = vmDetails[i].vmId;
                    if (vmDetails[i] !== undefined && retrievedvmid == vmid) {
                        selectedValue = vmDetails[i].resPoints[0].value;
                        this.set("selectedquickrestorepoint", vmDetails[i].resPoints[0].id);
                        dropdown = {
                            class: "adsblockElement truncate",
                            span: vmDetails[i].resPoints
                        };
                        dropdownData = {
                            selectAction: "quickrestorepointselector",
                            dropdownId: "resPtDiv",
                            selectedValue: selectedValue,
                            dropdown: dropdown,
                            id: "resPointid",
                            spanId: "resPointSpanId",
                            spanClass: "adsflLeft leftads adsinlineAndBlock adsblackFnt",
                            divClass: "adsflLeft deselectComponent adspositionRelative dropdown commondropdown ",
                            dropdownClass: "adsblockElement marginLeftRight",
                            dropdownSlideClass: "adsblockElement dropdownSlide uihide",
                            dropdownSlideStyle: "width:100%;max-height:120px;overflow-y:auto;",
                            divStyle: "outline:0;width:180px;left:5px;",
                            dropdownStyle: "width:220px;height:100%"
                        };

                        found = true;
                        break;
                    }
                }
                if (!found) {

                    dropdown = {
                        class: "adsblockElement truncate",
                        span: [{
                            id: "None",
                            value: "None"
                        }]
                    };

                    dropdownData = {
                        selectAction: "quickrestorepointselector",
                        dropdownId: "resPtDiv",
                        selectedValue: "No Restore Points",
                        dropdown: dropdown,
                        id: "resPointid",
                        spanId: "resPointSpanId",
                        spanClass: "adsflLeft leftads adsinlineAndBlock adsblackFnt",
                        divClass: "adsflLeft deselectComponent adspositionRelative dropdown commondropdown disableDiv",
                        dropdownClass: "adsblockElement marginLeftRight",
                        dropdownSlideClass: "adsblockElement dropdownSlide uihide",
                        dropdownSlideStyle: "width:100%;max-height:120px;overflow-y:auto;",
                        divStyle: "outline:0;width:180px;left:5px;",
                        dropdownStyle: "width:220px;height:100%"
                    };
                }

                Mapper.getCell('quickrestorepoints').setData(dropdownData);
            },
            showquickRestore: function(id) {

                this.set("selectedquickrestorepoint", "");

                var vmid = id.substring(8, id.length);
                var vmname = Ember.$("#_vmname" + vmid).text();

                var environmentType = this.get("selectedenvironmentfilter");
                var newVMnameHide = "";
                if(environmentType == 2){
                    newVMnameHide = " rmpHide";
                } 

                var Dobject = {
                    operation: "getParentHost",
                    vmid: vmid
                };

                var apiUrl = '/virtualConfiguration.do?methodToCall=getParentHost';
                var objects = serverReq(apiUrl, Dobject, false);
                if (!objects.islicensed) {
                    var errormsg = jsRb['rmp.virtual.vconfiguration.restore_license_esxi'];
                    if(this.get('selectedenvironmentfilter') == 2){
                        errormsg = jsRb['rmp.virtual.vconfiguration.restore_license_hyperv_host'];
                    }
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, errormsg, "Freezer.off()");
                    return;
                } else if (objects.parentserverdisabled) {
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, "Restore points could not be loaded for this virtual machine. Please enable the server " + objects.parentservername + ".", "Freezer.off()");
                    return;
                } else {

                    var Dobject = {
                        operation: "getBackedVMList",
                        serverId: this.get("selectedserverid"),
                        type: this.get("selectedservertype"),
                        restoreType: 1
                    };
                    var apiUrl = '/restoreAction.do?methodToCall=getBackedVMList';
                    var objects = serverReq(apiUrl, Dobject, false);

                    var vmDetails, vmCount = 0;
                    if (objects.length != 0) {
                        vmDetails = objects.backedVMList;
                        vmCount = vmDetails.length;
                    } else {
                        Freezer.on();
                        Popup.alert(i18n.Popup.msgTypes.invalidOperation, "Restore points could not be loaded for the host of this virtual machine. Ensure that the server is licensed and enabled.", "Freezer.off()");
                        return;
                    }


                    var restorenamebox = {
                        "name": "restorenamebox",
                        "dim": [0, 4, 236, 12],
                        fixed: [true, true],
                        "comp": {
                            "name": "input",
                            "type": "HTML",
                            "attributes": [{
                                "type": "type",
                                "value": "text"
                            }, {
                                "type": "style",
                                "value": "position:relative !important"
                            }, {
                                "type": "value",
                                "value": ""
                            }, {
                                "type": "placeholder",
                                "value": "Restore name"
                            }, {
                                "type": "maxlength",
                                "value": "75"
                            }]
                        },
                        "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                        "actions": [{
                            "type": "",
                            "method": ""
                        }]
                    };
                    var vmnamebox = {
                        "name": "vmnamebox",
                        "dim": [0, 4, 236, 12],
                        fixed: [true, true],
                        "comp": {
                            "name": "input",
                            "type": "HTML",
                            "attributes": [{
                                "type": "type",
                                "value": "text"
                            }, {
                                "type": "style",
                                "value": "position:relative !important"
                            }, {
                                "type": "value",
                                "value": vmname
                            }]
                        },
                        "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize", "disableDiv"],
                        "actions": [{
                            "type": "",
                            "method": ""
                        }]
                    };

                    var changevmnamebox = {
                        "name": "changevmnamebox",
                        "dim": [0, 4, 236, 12],
                        fixed: [true, true],
                        "comp": {
                            "name": "input",
                            "type": "HTML",
                            "attributes": [{
                                "type": "type",
                                "value": "text"
                            }, {
                                "type": "style",
                                "value": "position:relative !important"
                            }, {
                                "type": "value",
                                "value": vmname
                            }, {
                                "type": "placeholder",
                                "value": "New VM Name"
                            }, {
                                "type": "maxlength",
                                "value": "75"
                            }]
                        },
                        "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                        "actions": [{
                            "type": "",
                            "method": ""
                        }]
                    };
                    var dropdownbox = {
                        "name": "quickrestorepoints",
                        "dim": [0, 4, 220, 30],
                        "fixed": [true, true],
                        "comp": {
                            "type": "dynamic",
                            "data": true,
                            "name": "ui-multidropdown",
                            "attributes": [{
                                "type": "style",
                                "value": "position:relative !important"
                            }]
                        },
                        "actions": [{
                            "type": "didInsertElement",
                            "method": "populatequickrestorepoints",
                            "params": [vmDetails, vmid]
                        }]
                    };
                    var restorenameinsert = [{
                        id: "",
                        uiFramework: true,
                        compData: JSON.stringify(restorenamebox)
                    }];
                    var dropdowninsert = [{
                        id: "",
                        uiFramework: true,
                        compData: JSON.stringify(dropdownbox)
                    }];
                    var vmnameinsert = [{
                        id: "",
                        uiFramework: true,
                        compData: JSON.stringify(vmnamebox)
                    }];

                    var changevmnameinsert = [{
                        id: "",
                        uiFramework: true,
                        compData: JSON.stringify(changevmnamebox)
                    }];
                    Freezer.on();
                    var tr = [{
                        id: "",
                        class: "adspopUpTopBand adsblackFnt adspadding5",
                        th: [{
                            id: "",
                            colspan: "2",
                            class: "",
                            rowValue: [{
                                style: "font-weight:bold;",
                                value: "Easy Restore",

                                class: "adsflLeft adsblackFnt"
                            }, {
                                id: "addstoragepopupClose",
                                value: "",
                                class: "adsflRight adspopupDivClose",
                                divAction: "closequickBackupPopup"
                            }]
                        }]
                    }, {
                        id: "tablerow1",
                        class: "adsmargin10",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "NameText",
                            class: "transperantBorder",
                            style: "width:35%",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                value: "Operation Name :"
                            }]
                        }, {
                            id: "repositoryinsert",
                            class: "transperantBorder",
                            rowValue: restorenameinsert
                        }]
                    }, {
                        id: "tablerow2",
                        class: "adsmargin10",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "vmoriginal",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                value: "Selected VM :"
                            }]
                        }, {
                            id: "vmnameinsert",
                            class: "transperantBorder",
                            rowValue: vmnameinsert
                        }]
                    }, {
                        id: "tablerow3",
                        class: "adsmargin10" + newVMnameHide,
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "vmnewname",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                value: "New VM name :"
                            }]
                        }, {
                            id: "changevmnameinsert",
                            class: "transperantBorder",
                            rowValue: changevmnameinsert
                        }]
                    }, {
                        id: "tablerow6",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "",
                            style: "width:135px;",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "alwaysrestoretooriginal",
                                class: "ico14x14 checked adsmargin3 adsflRight disableDiv",
                                value: ""
                            }]
                        }, {
                            id: "",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "",
                                value: "Restore to original location"
                            }]
                        }]
                    }, {
                        id: "tablerow4",
                        class: "adsmargin10",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "loginNameTxt",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                value: "Restore Point :"
                            }]
                        }, {
                            id: "userinsert",
                            class: "transperantBorder",
                            rowValue: dropdowninsert
                        }]
                    }, {
                        id: "tablerow7",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "",
                            style: "width:135px;",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "alwayspoweron",
                                class: "ico14x14 checked adsmargin3 adsflRight disableDiv",
                                value: ""
                            }]
                        }, {
                            id: "",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "",
                                value: "Power On VM after Restore"
                            }]
                        }]
                    }, {
                        id: "",
                        class: "adsmargin10",
                        th: [{
                            id: "left1",
                            value: "",
                            colspan: "1"
                        }, {
                            id: "id",
                            colspan: "2",
                            class: "adsinlineAndBlock adsflLeft adsValignTop msg",
                            rowValue: [{
                                id: "_qr_" + vmid,
                                divAction: "createquickrestore",
                                value: "Start",
                                class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButtonSmall"
                            }, {
                                divAction: "closequickBackupPopup",
                                value: jsRb['rmp.recoverySettings.Cancel'],
                                class: "adsinlineAndBlock adsgrayButtonSmall adswhiteSpace adsmargin5 deselectComponent"
                            }]
                        }]
                    }];
                    var tableRow = {
                        id: "addstoragepopupbody",
                        class: "popup popupAlert adsfntFamily adsfntSize adsgrayfont",
                        style: "width:490px;height:300px",
                        tbody: {
                            id: "",
                            class: "",
                            tr: tr
                        }
                    };
                    var data = {
                        row: tableRow
                    };
                    Mapper.getCell('quickBackupPopup').setData(data);
                    Ember.$("#quickBackupPopup").removeClass('rmpHide');
                }

            },


            showquickBackup: function(id) {

                var vmid = id.substring(7, id.length);
                var Dobject = {
                    operation: "getParentHost",
                    vmid: vmid
                };

                var apiUrl = '/virtualConfiguration.do?methodToCall=getParentHost';
                var objects = serverReq(apiUrl, Dobject, false);
                if (!objects.islicensed) {
                    var errormsg = jsRb['rmp.virtual.vconfiguration.backup_license_esxi'];
                    if(this.get('selectedenvironmentfilter') == 2){
                        errormsg = jsRb['rmp.virtual.vconfiguration.backup_license_hyperv_host'];
                    }
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, errormsg, "Freezer.off()");
                    return;
                } else if (objects.parentserverdisabled) {
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, "This virtual machine is not available for backup. Please enable the server " + objects.parentservername + ".", "Freezer.off()");
                    return;
                } else {
                    var addStorageHide = "rmpHide";
                    if(this.get("selectedenvironmentfilter") == 2){
                        addStorageHide = "";
                    }
                    var vmname = Ember.$("#_vmname" + vmid).text();
                    var backupnamebox = {
                        "name": "backupnamebox",
                        "dim": [0, 4, 236, 12],
                        fixed: [true, true],
                        "comp": {
                            "name": "input",
                            "type": "HTML",
                            "attributes": [{
                                "type": "type",
                                "value": "text"
                            }, {
                                "type": "style",
                                "value": "position:relative !important"
                            }, {
                                "type": "value",
                                "value": ""
                            }, {
                                "type": "placeholder",
                                "value": "Backup name"
                            }, {
                                "type": "maxlength",
                                "value": "75"
                            }]
                        },
                        "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                        "actions": [{
                            "type": "",
                            "method": ""
                        }]
                    };
                    var vmnamebox = {
                        "name": "vmnamebox",
                        "dim": [0, 4, 236, 12],
                        fixed: [true, true],
                        "comp": {
                            "name": "input",
                            "type": "HTML",
                            "attributes": [{
                                "type": "type",
                                "value": "text"
                            }, {
                                "type": "style",
                                "value": "position:relative !important"
                            }, {
                                "type": "value",
                                "value": vmname
                            }]
                        },
                        "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize", "disableDiv"],
                        "actions": [{
                            "type": "",
                            "method": ""
                        }]
                    };
                    var dropdownbox = {
                        "name": "storagedropdown",
                        "dim": [0, 4, 186, 30],
                        "fixed": [true, true],
                        "comp": {
                            "type": "dynamic",
                            "data": true,
                            "name": "ui-multidropdown",
                            "attributes": [{
                                "type": "style",
                                "value": "position:relative !important"
                            }]
                        },
                        "actions": [{
                            "type": "didInsertElement",
                            "method": "populatestoragedropdown"
                        }]
                    };
                    var addStoragebutton = {
                        "name": "add_storage",
                        "dim": [610, 139, 24, 24],
                        "fixed": [true, true],
                        "classNames": ["adsblockElement","add_storage","adsmargin3","adsflLeft","cursorPointer",addStorageHide],
                        "comp": {
                            "type": "HTML",
                            "attributes": [{
                                "type": "style",
                                "value": "margin-left:160px;left:50%"
                            }, {
                                "type": "title",
                                "value": "Add Repository"
                            }]
                        },
                        "actions": [{
                            "type": "click",
                            "method": "addRepository"
                        }]
                    };
                    var backupnameinsert = [{
                        id: "",
                        uiFramework: true,
                        compData: JSON.stringify(backupnamebox)
                    }];
                    var dropdowninsert = [{
                        id: "",
                        uiFramework: true,
                        compData: JSON.stringify(dropdownbox)
                    }];
                    var vmnameinsert = [{
                        id: "",
                        uiFramework: true,
                        compData: JSON.stringify(vmnamebox)
                    }];
                    var addStorageinsert = [{
                        id: "",
                        uiFramework: true,
                        compData: JSON.stringify(addStoragebutton)
                    }];
                    Freezer.on();
                    var tr = [{
                        id: "",
                        class: "adspopUpTopBand adsblackFnt adspadding5",
                        th: [{
                            id: "",
                            colspan: "2",
                            class: "",
                            rowValue: [{
                                style: "font-weight:bold;",
                                value: "Easy Backup",

                                class: "adsflLeft adsblackFnt"
                            }, {
                                id: "addstoragepopupClose",
                                value: "",
                                class: "adsflRight adspopupDivClose",
                                divAction: "closequickBackupPopup"
                            }]
                        }]
                    }, {
                        id: "tablerow1",
                        class: "adsmargin10",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "NameText",
                            class: "transperantBorder",
                            style: 'width:30%',
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                value: "Backup Name :"
                            }]
                        }, {
                            id: "repositoryinsert",
                            class: "transperantBorder",
                            rowValue: backupnameinsert
                        }]
                    }, {
                        id: "tablerow2",
                        class: "adsmargin10",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "StorageText",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                value: "Selected VM :"
                            }]
                        }, {
                            id: "pathinsert",
                            class: "transperantBorder",
                            rowValue: vmnameinsert
                        }]
                    }, {
                        id: "tablerow6",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "",
                            style: "width:135px;",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "checkboxunchecked",
                                class: "ico14x14 checked adsmargin3 adsflRight disableDiv",
                                value: ""
                            }]
                        }, {
                            id: "",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "",
                                value: "Full backup"
                            }]
                        }]
                    }, {
                        id: "tablerow3",
                        class: "adsmargin10",
                        style: " background:#FFFFFF;border-radius:5px;height:35px;",
                        th: [{
                            id: "loginNameTxt",
                            class: "transperantBorder",
                            rowValue: [{
                                id: "",
                                class: "adsflRight",
                                value: "Respository :"
                            }]
                        }, {
                            id: "userinsert",
                            class: "transperantBorder",
                            rowValue: dropdowninsert
                        },{
                            id: "addStorageinsert",
                            class: "transperantBorder",
                            rowValue: addStorageinsert
                        }]
                    }, {
                        id: "",
                        class: "adsmargin10",
                        th: [{
                            id: "left1",
                            value: "",
                            colspan: "1"
                        }, {
                            id: "id",
                            colspan: "2",
                            class: "adsinlineAndBlock adsflLeft adsValignTop msg",
                            rowValue: [{
                                id: "_qb_" + vmid,
                                divAction: "createquickbackup",
                                value: "Start",
                                class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButtonSmall"
                            }, {
                                divAction: "closequickBackupPopup",
                                value: jsRb['rmp.recoverySettings.Cancel'],
                                class: "adsinlineAndBlock adsgrayButtonSmall adswhiteSpace adsmargin5 deselectComponent"
                            }]
                        }]
                    }];
                    var tableRow = {
                        id: "addstoragepopupbody",
                        class: "popup popupAlert adsfntFamily adsfntSize adsgrayfont",
                        style: "width:450px;height:180px;",
                        tbody: {
                            id: "",
                            class: "",
                            tr: tr
                        }
                    };
                    var data = {
                        row: tableRow
                    };
                    Mapper.getCell('quickBackupPopup').setData(data);
                    Ember.$("#quickBackupPopup").removeClass('rmpHide');
                }
            },

            addRepository: function() {
            //Freezer.bringFront();
            Ember.$("#quickBackupPopup").addClass("rmpHide");
            Ember.$("#addstoragepopup").toggleClass("rmpHide");
            var reposirtorybox = {
                "name": "repositoryName",
                "dim": [0, 4, 236, 12],
                fixed: [true, true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "text"
                    }, {
                        "type": "placeholder",
                        "value": "Ex : Repository_1"
                    }, {
                        "type": "style",
                        "value": "position:relative !important"
                    },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                },
                "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                "actions": [{
                    "type": "",
                    "method": ""
                }]
            };
            var pathbox = {
                "name": "pathName",
                "dim": [0, 4, 236, 12],
                fixed: [true, true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "text"
                    }, {
                        "type": "placeholder",
                        "value": "C:\\ManageEngine\\Repository_Path"
                    }, {
                        "type": "style",
                        "value": "position:relative !important"
                    },{
                        "type": "maxlength",
                        "value": "200"
                    }]
                },
                "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                "actions": [{
                    "type": "keyUp",//No I18N
                    "method": "checkPath",//No I18N
                    "params": ""//No I18N
                },{
                    "type": "focusOut",//No I18N
                    "method": "checkPath",//No I18N
                    "params": ""//No I18N
                }]
            };
            var userbox = {
                "name": "userNameRepository",
                "dim": [0, 4, 236, 12],
                fixed: [true, true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "text"
                    }, {
                        "type": "placeholder",
                        "value": "admin"
                    }, {
                        "type": "style",
                        "value": "position:relative !important"
                    },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                },
                "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                "actions": [{
                    "type": "",
                    "method": ""
                }]
            };
            var passwordbox = {
                "name": "passNameRepository",
                "dim": [0, 4, 236, 12],
                fixed: [true, true],
                "comp": {
                    "name": "input",
                    "type": "HTML",
                    "attributes": [{
                        "type": "type",
                        "value": "password"
                    }, {
                        "type": "placeholder",
                        "value": "password"
                    }, {
                        "type": "style",
                        "value": "position:relative !important"
                    },{
                        "type": "maxlength",
                        "value": "75"
                    }]
                },
                "classNames": ["adsfntFamily", "adsCustomTxtBox", "adsfntSize"],
                "actions": [{
                    "type": "",
                    "method": ""
                }]
            };
            var repositoryinsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(reposirtorybox)
            }];
            var pathinsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(pathbox)
            }];
            var userinsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(userbox)
            }];
            var passinsert = [{
                id: "",
                uiFramework: true,
                compData: JSON.stringify(passwordbox)
            }];
            var tr = [{
                id: "",
                class: "adspopUpTopBand adsblackFnt adspadding5",
                th: [{
                    id: "",
                    colspan: "2",
                    class: "",
                    rowValue: [{
                        style: "font-weight:bold;",
                        value: "Add Repository",
                        class: "adsflLeft adsblackFnt"
                    }, {
                        id: "addstoragepopupClose",
                        value: "",
                        class: "adsflRight adspopupDivClose",
                        divAction: "closeaddstoragepopup"
                    }]
                }]
            }, {
                id: "tablerow1",
                class: "adsmargin10",
                style: " background:#FFFFFF;border-radius:5px;height:35px;",
                th: [{
                    id: "NameText",
                    class: "transperantBorder",
                    rowValue: [{
                        id: "",
                        class: "adsflRight",
                        value: "Name :"
                    }]
                }, {
                    id: "repositoryinsert",
                    class: "transperantBorder",
                    rowValue: repositoryinsert
                }]
            }, {
                id: "tablerow2",
                class: "adsmargin10",
                style: " background:#FFFFFF;border-radius:5px;height:35px;",
                th: [{
                    id: "StorageText",
                    class: "transperantBorder",
                    rowValue: [{
                        id: "",
                        class: "adsflRight",
                        value: "Repository Path :"
                    }]
                }, {
                    id: "pathinsert",
                    class: "transperantBorder",
                    rowValue: pathinsert
                }]
            }, {

                id: "authentication",
                class: "adsmargin10",
                style: " background:#FFFFFF;border-radius:5px;height:35px;",
                th: [{
                    id: "Authenticaction",
                    class: "transperantBorder",
                    rowValue: [{
                        id: "",
                        class: "adsflRight",
                        value: "Authentication :"
                    }]
                }, {
                    id: "pathinsert",
                    class: "transperantBorder",
                    rowValue: [{
                        id: "isLocal",
                        class: "adsflRight onBtn",
                        value: "",
                        style: "position:relative;left:-245px;",
                        divAction: "toggleCredentials"
                    }, {
            id: "authenticatioInfo",// No I18N
            class: "truncate adsflRight small-info",// No I18N
            style: "position:relative;left:-200px;top:2px;",// No I18N
            value: "",// No I18N
            title: jsRb['rmp.virtual.vrepository.authentication_info'],// No I18N
            divAction: ""// No I18N
}]
                }]
            }, {
                id: "repotablerow3",
                class: "adsmargin10",
                style: " background:#FFFFFF;border-radius:5px;height:35px;",
                th: [{
                    id: "loginNameTxt",
                    class: "transperantBorder",
                    rowValue: [{
                        id: "",
                        class: "adsflRight",
                        value: "Username :"
                    }]
                }, {
                    id: "userinsert",
                    class: "transperantBorder",
                    rowValue: userinsert
                }]
            }, {
                id: "repotablerow4",
                class: "adsmargin10",
                style: " background:#FFFFFF;border-radius:5px;height:35px;",
                th: [{
                    id: "passwordTxt",
                    class: "transperantBorder",
                    rowValue: [{
                        id: "",
                        class: "adsflRight",
                        value: "Password :"
                    }]
                }, {
                    id: "passinsert",
                    class: "transperantBorder",
                    rowValue: passinsert
                }]
            }, {
                id: "",
                class: "adsmargin10",
                th: [{
                    id: "left1",
                    value: "",
                    colspan: "1"
                }, {
                    id: "id",
                    colspan: "2",
                    class: "adsinlineAndBlock adsflLeft adsValignTop msg",
                    style: "",
                    rowValue: [{
                            id: "add_repo_btn",
                            divAction: "updatestorage",
                            value: "Add",
                            class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButtonSmall"
                        },
                        //adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButton
                        {
                            divAction: "closeaddstoragepopup",
                            value: "Cancel",
                            class: "adsinlineAndBlock adsgrayButtonSmall adswhiteSpace adsmargin5 deselectComponent"
                        }
                        //adsinlineAndBlock adsgrayButton adswhiteSpace adsmargin5 deselectComponent
                    ]
                }]
            }];
            var tableRow = {
                id: "addstoragepopupbody",
                class: "popup popupAlert adsfntFamily adsfntSize adsgrayfont",
                style: "width:auto!important;",
                tbody: {
                    id: "",
                    class: "",
                    tr: tr
                }
            };
            var data = {
                row: tableRow
            };
            Mapper.getCell("addstoragepopup").setData(data);
        }, //addRepository Ends here
        updatestorage: function() {
            var storagename = Ember.$("#repositoryName").val().trim();
            var virtualEnvironment = this.get("selectedenvironment");
            if (storagename == "") {
                Freezer.bringFront();
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, "Please enter a name for the Repository", "Freezer.sendBack()");
                return;
            }

            var patt = new RegExp(/^[a-zA-Z0-9_ -]+$/);
            if(patt.test(storagename) == false) {
                Freezer.bringFront();
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vrepository.spl_character_repository'], "Freezer.sendBack()");
                return;
            }

            var isLocal = true;
            var username = "",
                password = "";
            if (Ember.$('#isLocal').hasClass('onBtn')) {
                username = Ember.$("#userNameRepository").val().trim();
                password = Ember.$("#passNameRepository").val().trim();
                isLocal = false;
            }

            var path = Ember.$("#pathName").val().trim();
            if (path == "") {
                Freezer.bringFront();
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, "Please enter Repository Path", "Freezer.sendBack()");
                return;
            }else if(path.substring(0,2) == "\\\\" && isLocal){
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.error, "Please provide Authentication for Share!", "Freezer.sendBack()");// No I18N
                    return;
            }else if (path.substring(0, 1) == "\\" && isLocal) {
                Freezer.bringFront();
                Popup.alert(i18n.Popup.msgTypes.error, jsRb['rmp.virtual.vrepository.check_path_specified'], "Freezer.sendBack()"); //NO I18N
                return;
            } else if(path.substring(0,2) != "\\\\"){
                    isLocal=true;
                    if(virtualEnvironment == 2){
                        Freezer.bringFront();
                        Popup.alert(i18n.Popup.msgTypes.error, jsRb['rmp.virtual.vbackup.only_share_repository'], "Freezer.sendBack()");// No I18N
                        return;
                    }
            }
            //var username=Ember.$("#userName").val().trim();

            if(Ember.$('#isLocal').hasClass('onBtn')){
                if(username == ""){
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.error, "Please provide a Username", "Freezer.sendBack()");
                    return;
                }
                else if(password == ""){
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.error, "Please provide a Password", "Freezer.sendBack()");
                    return;
                }
                }

            var Dobject = {
                operation: "addRepository",
                name: encodeURIComponent(storagename),
                path: encodeURIComponent(path),
                username: encodeURIComponent(username),
                password: encodeURIComponent(password),
                isLocal: isLocal
            };

            Dobject.name = encodeURIComponent(Dobject.name);
            Dobject.path = encodeURIComponent(Dobject.path);
            Dobject.username = encodeURIComponent(Dobject.username);
            Dobject.password = encodeURIComponent(Dobject.password);

            var apiUrl = '/virtualBackup.do?methodToCall=addRepository'; //NO I18N

            //var objects = serverReq(apiUrl, Dobject, false);
            //this.send("closeaddstoragepopup");

            Freezer.bringFront();
            Ember.$("#spinnerWheel").removeClass("rmpHide");
            var _this = this;
            testreq(apiUrl, Dobject).done(function(objects) {
                if (objects == undefined) {
                    Freezer.bringFront();
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, "Request could not be processed", "Freezer.sendBack()");
                    
                } else if (objects.hasOwnProperty("errorCode")) {
                    Ember.$("#spinnerWheel").addClass("rmpHide");

                    Freezer.bringFront();
                    if(objects.errorCode==401){
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[objects.errorMsg], "Freezer.sendBack()");
                    }else{
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, objects.errorMsg, "Freezer.sendBack()");
                    }
                } else {
                    Freezer.sendBack();
                    //Freezer.off();
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    
                    if (objects.hasOwnProperty("message")) {
                        Notify.show("Repository configured");
                    } else {
                        Notify.show(jsRb['rmp.virtual.vrepository.added_notification']);
                    }

                    Mapper.getCell("storagedropdown").deleteData();
                    _this.set("selectedrepository", objects.repositoryid);

                    
                    var Dobject = {
                        "operation": "populateStorageDropdown",
                        "virtualEnvironment": virtualEnvironment,
                        "repositoryids": []
                    };
                    apiUrl = '/virtualBackup.do?methodToCall=populateStorageDropdown'; //NO I18N
                    var repdataobjects = serverReq(apiUrl, Dobject, false);

                    var dropdown = {
                        class: "adsblockElement",
                        span: repdataobjects.repository
                    };

                    var data = {
                        dropdownId: "storagedropdownId",
                        selectAction: "SelectRepository",
                        selectedValue: storagename,
                        dropdown: dropdown,
                        id: "storageSelect",
                        spanId: "storageSlide",
                        spanStyle:"max-width:190px;",
                        spanClass: "adsflLeft leftads adsinlineAndBlock adsblackFnt truncate",
                        divClass: "adsflLeft deselectComponent adspositionRelative dropdown commondropdown adsfntSize",
                        dropdownClass: "adsblockElement marginLeftRight ",
                        dropdownSlideClass: "adsblockElement dropdownSlide dropdownhover uihide",
                        dropdownSlideStyle: "width:100%;",
                        dropdownStyle: "width:220px;height:100%"
                    };
                    Ember.run.schedule("afterRender", _this, function() {
                        Mapper.getCell("storagedropdown").setData(data);
                    });
                    _this.send("closeaddstoragepopup");




                }
            });




            // if(objects.hasOwnProperty("errorCode")){
            //  Freezer.bringFront();
            //  Popup.alert(i18n.Popup.msgTypes.invalidOperation,objects.errormsg, "Freezer.sendBack()");
            //  return;
            // }else if(objects==undefined){
            //  Freezer.bringFront();
            //  Popup.alert(i18n.Popup.msgTypes.invalidOperation, "Could not Connect to Repository", "Freezer.sendBack()");
            //  return;
            // }

        }, //updatestorage Ends here
            //check for local repository
        checkPath: function(){
            var repoPath = Ember.$('#pathName').val();//No I18N
            if(repoPath.substring(0, 2) == "\\\\"){//No I18N
                Ember.$('#isLocal').removeClass('offBtn').removeClass('disableDiv').addClass('onBtn');//No I18N
                Ember.$('#repotablerow3').removeClass('rmpHide');//No I18N
                Ember.$('#repotablerow4').removeClass('rmpHide');//No I18N
            }else if(repoPath != ""){
                Ember.$('#isLocal').removeClass('onBtn').addClass('offBtn').addClass('disableDiv');//No I18N
                Ember.$('#repotablerow3').addClass('rmpHide');//No I18N
                Ember.$('#repotablerow4').addClass('rmpHide');//No I18N
                Ember.$('#userName').val("");//No I18N
                Ember.$('#passName').val("");//No I18N
            }
        },
        closeaddstoragepopup: function() {
            Mapper.getCell("addstoragepopup").deleteData();
            Ember.$("#addstoragepopup").toggleClass("rmpHide");
            Ember.$("#quickBackupPopup").removeClass("rmpHide");
            Freezer.sendBack();
        },


            //req:{"operation":"createRestore","resLabel":"opname","resType":true,"isSameHost":true,"resHostId":0,
            //"selVMList":[{"nameOfVm":"ENCrypt","backupName":"ENCrypt","serverName":"172.21.179.103 ","resPointofVM":"Feb-23-2017 11:07:06","backupVmId":303,"vmId":605}],
            //"powerstatus":true}

            createquickrestore: function(id) {

                var virtualEnvironment = this.get("selectedenvironmentfilter");
                var resLabel = encodeURIComponent(Ember.$("#restorenamebox").val().trim());
                var nameOfVm = encodeURIComponent(Ember.$("#changevmnamebox").val().trim());
                var backupName = encodeURIComponent(Ember.$("#vmnamebox").val().trim());
                var serverName = encodeURIComponent(Ember.$("#serverSelect").text().trim());
                var resPointofVM = encodeURIComponent(Ember.$("#resPointid").text().trim());
                var selVMList = [{
                    "nameOfVm": nameOfVm,
                    "backupName": backupName,
                    "serverName": serverName,
                    "resPointofVM": resPointofVM,
                    "backupVmId": this.get("selectedquickrestorepoint"),
                    "vmId": id.substring(4, id.length)
                }];


                if (resLabel == "") {
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, "Please enter a name for the Restore job", "Freezer.sendBack()");
                    return;
                }

                var patt = new RegExp(/^[a-zA-Z0-9_ -]+$/);
                if (patt.test(Ember.$("#restorenamebox").val().trim()) == false) {
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vrestore.spl_character_restore_name'], "Freezer.sendBack()");
                    return;
                }

                if (this.get("selectedquickrestorepoint") == "" || isNaN(this.get("selectedquickrestorepoint"))) {
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, "No Backups available for this virtual machine", "Freezer.sendBack()");
                    return;
                }



                var xObject = {
                    operation: "checkVMName",
                    desHostId: 0,
                    virtualEnvironment: virtualEnvironment,
                    isFullRestore: true

                };
                xObject.selVMs = selVMList
                var _this = this;
                var apiUrl = '/restoreAction.do?methodToCall=checkVMName';
                Freezer.bringFront();
                Ember.$("#spinnerWheel").removeClass("rmpHide");
                var _this = this;
                //var objects = serverReq(apiUrl, Dobject, false);
                $.ajax({
                    type: "GET",
                    async: true,
                    contentType: true ? "application/json; charset=utf-8" : "text/html; charset=utf-8",
                    dataType: "json",
                    url: apiUrl,
                    data: {
                        query: JSON.stringify(xObject)
                    }
                }).done(function(objects) {
                    Freezer.sendBack();
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    if (objects.status) {

                        Freezer.bringFront();
                        if (objects.isvCenter) {
                            Popup.alert(i18n.Popup.msgTypes.error, jsRb['rmp.virtual.vrestore.vcenter_contains_vm_names'] + "\n" + decodeURIComponent(JSON.stringify(objects.vmNames)) + "\n" + jsRb['rmp.virtual.vrestore.change_names_to_restore'], "Freezer.sendBack()");
                        } else {
                            Popup.alert(i18n.Popup.msgTypes.error, jsRb['rmp.virtual.vrestore.destination_contains_vm_names'] + "\n" + decodeURIComponent(JSON.stringify(objects.vmNames)) + "\n" + jsRb['rmp.virtual.vrestore.change_names_to_restore'], "Freezer.sendBack()");
                        }

                        return;
                    } else if (objects.hasOwnProperty("errorCode")) { // No I18N
                        Freezer.bringFront();
                        Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[objects.errorMsg], "Freezer.sendBack()"); // No I18N
                        return;
                    } else {
 
                        Freezer.sendBack();
                        apiUrl = '/restoreAction.do?methodToCall=createRestore';
                        var Dobject = {
                            operation: "createRestore",
                            virtualEnvironment:virtualEnvironment,
                            resLabel: resLabel,
                            resType: 1,
                            isSameHost: true,
                            resHostId: 0,
                            selVMList: selVMList,
                            powerstatus: true
                        };

                        for (i = 0; i < Dobject.selVMList.length; i++) {
                            Dobject.selVMList[i].backupName = encodeURIComponent(Dobject.selVMList[i].backupName);
                            Dobject.selVMList[i].nameOfVm = encodeURIComponent(Dobject.selVMList[i].nameOfVm);
                        }

                        testreq(apiUrl, Dobject).done(function(data) {
                            if (data == undefined) {
                                Notify.show("Restoration could not be started", 2); // No I18N
                            } else if (data.hasOwnProperty("errorCode")) {
                                if (data.errorCode == 401) {
                                    Freezer.bringFront();
                                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[data.errorMsg], "Freezer.sendBack()");
                                    return;
                                } else if (data.errorCode == 106){
                                        Notify.show("Restore Failed", 2); // No I18N
                                }else {
                                    Notify.show("Restoration could not be started", 2); // No I18N
                                }
                            } else {
                                Notify.show("Restoration Complete");
                            }
                        });

                        _this.send("closequickBackupPopup");
                        //Ember.run.later(function({
                        _this.send("backbtn");
                        Ember.run.later(function() {
                            navigate('vrestore');
                        });
                        //_this.send("closequickBackupPopup");
                        //Ember.run.later(function({
                        //_this.send("backbtn");
                        //navigate('vrestore');
                        //}));
                    }
                });

            },
            createquickbackup: function(id) {
                var schedulename = Ember.$("#backupnamebox").val().trim();
                var repositoryid = this.get("selectedrepository");
                var virtualEnvironment = this.get("selectedenvironmentfilter");
                var retentioncount = 1;
                var ibmask = "Daily";
                var ibdate = "01";
                var ibday = "01";
                var ibhrs = "00";
                var ibmins = "00";
                var fbon = false;
                var fbmask = "Daily";
                var fbdate = "01";
                var fbday = "01";
                var fbhrs = "00";
                var fbmins = "00";

                if (schedulename == "") {
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, "Please enter a name for the Backup Schedule.", "Freezer.sendBack()");
                    return;
                }

                var patt = new RegExp(/^[a-zA-Z0-9_ -]+$/);
                if (patt.test(schedulename) == false) {
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vrepository.spl_character_backup_name'], "Freezer.sendBack()");
                    return;
                }

                if (repositoryid == 0) {
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, "There are no repositories available . Please configure a repository.", "Freezer.sendBack()");
                    return;
                }

                if (repositoryid == "" || isNaN(repositoryid)) {
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, "Please select a Repository.", "Freezer.sendBack()");
                    return;
                }



                var Dobject = {
                    operation: "createSchedule",
                    scheduledetails: {
                        virtualEnvironment: virtualEnvironment,
                        schedulename: schedulename,
                        repositoryid: repositoryid,
                        retentioncount: retentioncount,
                        ibmask: ibmask,
                        ibdate: ibdate,
                        vmids: [{
                            vmid: id.substring(4, id.length)
                        }],
                        ibday: ibday,
                        ibhrs: ibhrs,
                        ibmins: ibmins,
                        fbon: fbon,
                        fbmask: fbmask,
                        fbdate: fbdate,
                        fbday: fbday,
                        fbhrs: fbhrs,
                        fbmins: fbmins,
                        isquickbackup: true,
                        //for encryption starts
                        isEncrypted: false,
                        secretKey: ""
                        //for encryption ends
                    }
                };

                var apiUrl = '/virtualBackup.do?methodToCall=createSchedule'; //NO I18N
                Freezer.bringFront();
                Ember.$("#spinnerWheel").removeClass("rmpHide");
                var _this = this;
                testreq(apiUrl, Dobject).done(function(data) {
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    Freezer.sendBack();
                    if (data == undefined) {
                        Notify.show("Request could not be processed", 2);
                    } else if (data.hasOwnProperty("errorCode")) {
                        if (data.errorCode == 401) {
                            Freezer.bringFront();
                            Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[data.errorMsg], "Freezer.sendBack()");
                            _this.send("buttonActions", "cancelschedule");
                        } else {
                            Notify.show(data.errorMsg, 2);
                        }
                    } else {
                        Notify.show("New Backup Created");
                        _this.send("closequickBackupPopup");
                        //Ember.run.later(function({
                        _this.send("backbtn");
                        navigate('vbackup');
                        //}));

                    }
                });
            },


            closequickBackupPopup: function() {
                //Mapper.getCell('quickrestorepoints').deleteData();
                Mapper.getCell('quickBackupPopup').deleteData();
                Ember.$("#quickBackupPopup").addClass('rmpHide');
                Freezer.off();
            },
            
        vmViewInput: function(id) {
            Ember.$('#select_server_label').removeClass('rmpHide');
            Ember.$('#back-btn').removeClass('rmpHide');
            Ember.$('#licenseMgmt-btn').addClass('rmpHide');
            var servertype = id.substring(0, 1);
            var serverid = id.substring(9, id.length);
            this.set("vmViewrangestart", 1);
            this.set("limit", 10);
            var rangestart = this.get("vmViewrangestart");
            var limit = this.get("limit");
            var Dobject = {
                operation: "getVMList",
                operationtype:"list",
                serverdetails: {
                    serverid: serverid,
                    rangestart: this.get("vmViewrangestart"),
                    limit: this.get("limit"),
                    type: servertype,
                    listAll: false,
                },
            includeunlicensedhosts:true

            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=getVMList'; //NO I18N
            var objects = serverReq(apiUrl, Dobject, false);
            var vmdetails = objects;
            var vmcount = vmdetails.vmcount;
            var selectedserver = Ember.$("#" + servertype + "servername" + serverid).text();
            this.set("vmViewvmcount", vmcount);
            this.set("selectedserverid", serverid);
            this.set("selectedservertype", servertype);
            var vms = vmdetails.vms;
            if(objects.hasOwnProperty("errorCode")){
                vms = [];
            }
            var virtualEnvironment = this.get("selectedenvironmentfilter");
            if (rangestart + limit > vmcount) {
                this.set("limit", vmcount - rangestart + 1);
            } 
            this.send("populatevmview", vms);
            var Dobject = {
                operation: "populateServerDropdown",
                requestpage: "vconfiguration",
                virtualEnvironment : virtualEnvironment
            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=populateServerDropdown'; //NO I18N
            var objects = serverReq(apiUrl, Dobject, false);
            var topIconClass = "vcenter";
            if(virtualEnvironment == 2){
                topIconClass = "scvmmIcon";
            }
            if(Ember.$("#" + servertype + "servername" + serverid).length){
                selectedserver = Ember.$("#" + servertype + "servername" + serverid).text();
            }
            else{
                var temp = objects.spandata[0];
                if(temp != null && temp!=undefined){
                    selectedserver = temp.value; 
                }  
                else{
                    selectedserver = "";
                }
            }
            //alert(JSON.stringify(objects.spandata));
            //         var dropdown={
            //   class:"adsblockElement",
            //   span:[{id:"1",type:"1",value:"ebin-dc1",category:"true",subdata:[{id:"1.1",type:"2",subname:"Vsphere1"},{id:"1.2",type:"2",subname:"Vsphere2"}]},{id:"2",type:"1",value:"ebin-dc2",category:"true",subdata:[{id:"2.1",type:"2",subname:"Vsphere3"},{id:"2.2",type:"2",subname:"Vsphere4"}]},{id:"3",type:"2",value:"munchdc-1"},{id:"4",type:"2",value:"munchdc-2"}]
            //};
            var dropdown = {
                class: "adsblockElement",
                span: objects.spandata
            };
            var data = {
                dropdownId: "serverdropdownId",
                selectAction: "serverSelect",
                selectedValue: selectedserver,
                dropdown: dropdown,
                id: "serverSelect",
                spanId: "domainSlide",
                spanClass: "adsflLeft leftads adsinlineAndBlock adsblackFnt",
                divClass: "adsflLeft deselectComponent adspositionRelative dropdown commondropdown adsfntSize",
                dropdownClass: "adsblockElement marginLeftRight ",
                dropdownSlideClass: "adsblockElement dropdownSlide dropdownhover uihide",
                dropdownSlideStyle: "width:100%;",
                dropdownStyle: "width:240px;height:100%",
                categoryIconClass: 'truncate adsflLeft '+ topIconClass,
                categoryIconStyle: 'margin:6px 5px 0px 5px;',
                subIconClass: 'truncate adsflLeft esx',
                subIconStyle: 'margin:6px 5px 0px 15px;',
                subStyle: 'display:block;padding-left:45px;',
                subClass: '',
                nonCategoryIconClass: 'truncate adsflLeft esx',
                nonCategoryIconStyle: 'margin:6px 5px 0px 5px;'
            };
           Ember.run.schedule("afterRender", this, function () {
            Mapper.getCell('serverdropdown').setData(data); //No I18N
            Ember.$('#serverdropdown').removeClass('rmpHide');
            Ember.$('#serverDiv').addClass('rmpHide');
            Ember.$('#vmDiv').removeClass('rmpHide');
            Ember.$('#addServer-btn').addClass('rmpHide');
            Ember.$('#addserverDiv').addClass('rmpHide');
                       
           });
            
        },
        disableenableServer: function(iconid) {
            if (Ember.$("#" + iconid).hasClass('enableIcon')) {
                Freezer.on();
                this.send('disableornotpopup', iconid);
            } else if (Ember.$("#" + iconid).hasClass('disableIcon')) {
                Freezer.on();
                this.send('enableornotpopup', iconid);
            }
        },

        deleteServer: function(iconid) {
          Freezer.on();
            Mapper.getCell('disableornotpopup').deleteData();
            var tr = [{
                id: "",
                class: "adspopUpTopBand adsblackFnt adspadding5",
                th: [{
                    id: "",
                    colspan: "2",
                    class: "",
                    rowValue: [{
                        style: "font-weight:bold;",
                        value: jsRb['rmp.virtual.vconfiguration.delete_server'],
                        class: "adsflLeft adsblackFnt"
                    }, {
                        id: "deleteornotid",
                        value: "",
                        class: "adsflRight adspopupDivClose",
                        divAction: "closedisableornotpopup"
                    }]
                }]
            }, {
                id: "",
                class: "adsmargin10",
                th: [{
                    id: "",
                    colspan: "2",
                    class: "adsinlineAndBlock adsflLeft adspadding5",
                    rowValue: [{
                        style: "",
                        class: "adsconfirmIcon"
                    }]
                }, {
                    id: "",
                    colspan: "2",
                    class: "adsinlineAndBlock adsflLeft adsValignTop msg",
                    rowValue: [{
                        style: "",
                        value: jsRb['rmp.virtual.vconfiguration.confirm_delete_server'],
                        class: "adsblockElement adsfontSize11 paddingTopBtm"
                    },
                    {
                        id: "yes" + iconid,
                        divAction: "finishdeletingserver",
                        i18nText: true,
                        value: "rmp.common.Yes",
                        class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButton"
                    }, {
                        id: "no" + iconid,
                        divAction: "closedisableornotpopup",
                        i18nText: true,
                        value: "rmp.common.No",
                        class: "adsinlineAndBlock adsgrayButton adswhiteSpace adsmargin5 deselectComponent"
                    }]
                }]
            }];
            var tableRow = {
                id: "disableornotpopupbody",
                class: "popup popupAlert adsfntFamily adsfntSize adsgrayfont",
                style: "",
                tbody: {
                    id: "",
                    class: "",
                    tr: tr
                }
            };
            var data = {
                row: tableRow
            };
            Mapper.getCell('disableornotpopup').setData(data);
            Ember.$("#disableornotpopup").toggleClass('rmpHide');
        },
        finishdeletingserver: function(iconid) {
            var serverid,type,parentserverid;
            var virtualEnvironment = this.get("selectedenvironmentfilter");
            var isScvmmChildHost = false;
            if(iconid.indexOf("check") != -1){
                var combinedId = iconid.substring(8, iconid.length);
                var idarr = combinedId.split("_");
                parentserverid = idarr[0];
                serverid = idarr[1];
                //iconid = id.substring(3, id.length);
                type = "2";
                isScvmmChildHost = true;
            }
            else{
                serverid = iconid.substring(11, iconid.length);
                parentserverid = serverid;
                //iconid = id.substring(3, id.length);
                type = iconid.charAt(3);
            }
            var Dobject = {
                operation: "deleteServer",
                serverid: serverid,
                servertype: type,
                virtualEnvironment: virtualEnvironment
            };

            var apiUrl = '/virtualConfiguration.do?methodToCall=deleteServer'; //NO I18N
            //var objects = serverReq(apiUrl, Dobject, false);
            Freezer.bringFront();
            this.send("closedisableornotpopup");
            Freezer.on();
            Ember.$("#spinnerWheel").removeClass("rmpHide");
            var _this = this;
            testreq(apiUrl, Dobject).done(function(data) {
                if (data == undefined) {
                    Freezer.sendBack();
                    Freezer.off();
                    //_this.send("closedisableornotpopup");
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    Notify.show(jsRb['rmp.common.virtual.request_could_not_be_processed'], 2);
                } else if (data.hasOwnProperty("errorCode")) {
                    Freezer.sendBack();
                    Freezer.off();
                    //_this.send("closedisableornotpopup");
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    if(data.errorCode==401){
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[data.errorMsg], "Freezer.off()");
                    }else{
                    Notify.show(jsRb['rmp.common.virtual.request_could_not_be_processed'], 2);
                    }
                } else {
                    Freezer.sendBack();
                    Freezer.off();
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    //_this.send("closedisableornotpopup");
                    if(isScvmmChildHost){
                        _this.send("scvmmHostViewInput",parentserverid,"false");
                    }
                    else{
                        _this.send("serverViewInput");
                    }
                    Notify.show(jsRb['rmp.virtual.vconfiguration.server_has_been_deleted']);
                }
            });
        },
        disableornotpopup: function(iconid) {
            Ember.$("#disableornotpopup").toggleClass('rmpHide');
            var tr = [{
                id: "",
                class: "adspopUpTopBand adsblackFnt adspadding5",
                th: [{
                    id: "",
                    colspan: "2",
                    class: "",
                    rowValue: [{
                        style: "font-weight:bold;",
                        value: jsRb['rmp.virtual.vconfiguration.disable_server'],
                        class: "adsflLeft adsblackFnt"
                    }, {
                        id: "disableornotpopupid",
                        value: "",
                        class: "adsflRight adspopupDivClose",
                        divAction: "closedisableornotpopup"
                    }]
                }]
            }, {
                id: "",
                class: "adsmargin10",
                th: [{
                    id: "",
                    colspan: "2",
                    class: "adsinlineAndBlock adsflLeft adspadding5",
                    rowValue: [{
                        style: "",
                        class: "adsconfirmIcon"
                    }]
                }, {
                    id: "",
                    colspan: "2",
                    class: "adsinlineAndBlock adsflLeft adsValignTop msg",
                    rowValue: [{
                        style: "",
                        value: jsRb['rmp.virtual.vconfiguration.confirm_disable_server'],
                        class: "adsblockElement adsfontSize11 paddingTopBtm"
                    }, {
                        id: "yes" + iconid,
                        divAction: "finishdisablingserver",
                        i18nText: true,
                        value: "rmp.common.Yes",
                        class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButton"
                    }, {
                        divAction: "closedisableornotpopup",
                        i18nText: true,
                        value: "rmp.common.No",
                        class: "adsinlineAndBlock adsgrayButton adswhiteSpace adsmargin5 deselectComponent"
                    }]
                }]
            }];
            var tableRow = {
                id: "disableornotpopupbody",
                class: "popup popupAlert adsfntFamily adsfntSize adsgrayfont",
                style: "",
                tbody: {
                    id: "",
                    class: "",
                    tr: tr
                }
            };
            var data = {
                row: tableRow
            };
            Mapper.getCell('disableornotpopup').setData(data);
        },
        enableornotpopup: function(iconid) {
            Ember.$("#disableornotpopup").toggleClass('rmpHide');
            var tr = [{
                id: "",
                class: "adspopUpTopBand adsblackFnt adspadding5",
                th: [{
                    id: "",
                    colspan: "2",
                    class: "",
                    rowValue: [{
                        style: "font-weight:bold;",
                        value: jsRb['rmp.virtual.vconfiguration.enable_server'],
                        class: "adsflLeft adsblackFnt"
                    }, {
                        id: "enableornotpopupid",
                        value: "",
                        class: "adsflRight adspopupDivClose",
                        divAction: "closedisableornotpopup"
                    }]
                }]
            }, {
                id: "",
                class: "adsmargin10",
                th: [{
                    id: "",
                    colspan: "2",
                    class: "adsinlineAndBlock adsflLeft adspadding5",
                    rowValue: [{
                        style: "",
                        class: "adsconfirmIcon"
                    }]
                }, {
                    id: "",
                    colspan: "2",
                    class: "adsinlineAndBlock adsflLeft adsValignTop msg",
                    rowValue: [{
                        style: "",
                        value: jsRb['rmp.virtual.vconfiguration.confirm_enable_server'],
                        class: "adsblockElement adsfontSize11 paddingTopBtm"
                    }, {
                        id: "yes" + iconid,
                        divAction: "finishenablingserver",
                        i18nText: true,
                        value: "rmp.common.Yes",
                        class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButton"
                    }, {
                        divAction: "closedisableornotpopup",
                        i18nText: true,
                        value: "rmp.common.No",
                        class: "adsinlineAndBlock adsgrayButton adswhiteSpace adsmargin5 deselectComponent"
                    }]
                }]
            }];
            var tableRow = {
                id: "enableornotpopupbody",
                class: "popup popupAlert adsfntFamily adsfntSize adsgrayfont",
                style: "",
                tbody: {
                    id: "",
                    class: "",
                    tr: tr
                }
            };
            var data = {
                row: tableRow
            };
            Mapper.getCell('disableornotpopup').setData(data);
        },
        finishdisablingserver: function(id) {
            var serverid = id.substring(12, id.length);
            var iconid = id.substring(3, id.length);
            var type = id.charAt(3);
            var Dobject = {
                operation: "enableDisableServer",
                operationtype:"disable",
                serverid: serverid,
                servertype: type,
            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=enableDisableServer'; //NO I18N
            // var objects = serverReq(apiUrl, Dobject, false);
            // if(objects.errorCode==401){
            // this.send("closedisableornotpopup");
            // Freezer.on();
            // Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[objects.errorMsg], "Freezer.off()");
            // }else{
            // this.send("closedisableornotpopup");
            // this.send("serverViewInput"); 
            // }

            Freezer.on();
            Ember.$("#spinnerWheel").removeClass("rmpHide");
            var _this = this;
            _this.send("closedisableornotpopup");
            Freezer.on();
            testreq(apiUrl, Dobject).done(function(data) {
                Ember.$("#spinnerWheel").addClass("rmpHide");
                if (data == undefined) {
                    Freezer.off();
                    Notify.show(jsRb['rmp.common.virtual.request_could_not_be_processed'], 2);
                } else if (data.hasOwnProperty("errorCode")) {
                        if(data.errorCode==401){
                            Freezer.on();
                            Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[data.errorMsg], "Freezer.off()");
                        }else{
                        Freezer.off();
                        Notify.show(data.errorMsg, 2);
                        }
                } else {
                        Freezer.off();
                        _this.send("serverViewInput"); 
                }
            });

        },
        finishenablingserver: function(id) {
            var serverid = id.substring(12, id.length);
            var iconid = id.substring(3, id.length);
            var type = id.charAt(3);
            var Dobject = {
                operation: "enableDisableServer",
                operationtype:"enable",
                serverid: serverid,
                servertype: type,
            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=enableDisableServer'; //NO I18N
            Ember.$("#spinnerWheel").removeClass("rmpHide");
            var _this = this;
            Freezer.on();
            this.send("closedisableornotpopup");
            Freezer.on();
            testreq(apiUrl, Dobject).done(function(data) {
                Ember.$("#spinnerWheel").addClass("rmpHide");
                if (data == undefined) {
                    Freezer.off();
                    Notify.show(jsRb['rmp.common.virtual.request_could_not_be_processed'], 2);
                } else if (data.hasOwnProperty("errorCode")) {
                        if(data.errorCode==401){
                            Freezer.on();
                            Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[data.errorMsg], "Freezer.off()");
                        }else{
                        Freezer.off();
                        Notify.show(data.errorMsg, 2);
                        }
                } else {
                        Freezer.off();
                        _this.send("serverViewInput"); 
                }
            });

        },
        closedisableornotpopup: function(id) {
            Mapper.getCell('disableornotpopup').deleteData();
            Ember.$("#disableornotpopup").toggleClass('rmpHide');
            Freezer.off();
            this.send("serverViewInput");
            if(id != null && id!=undefined){
                if(id.indexOf("check") != -1){
                    var checkboxId = id.substring(2, id.length);
                    Ember.$("#" + checkboxId).toggleClass("unchecked");
                    Ember.$("#" + checkboxId).toggleClass("checked");
                }
            }
        },
        configurenow: function(id) {
            
            var elementArray1=[];


            elementArray1=Ember.$("#"+id).parent().siblings().children('.enableIcon');
            Ember.$("#"+id+"license").hasClass('adsDanger');
            
            if(elementArray1.length<=0 && Ember.$("#"+id+"license").hasClass('adsDanger')){
                Freezer.on();
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vconfiguration.only_licensed_and_enabled'], "Freezer.off()");
                return;
            }else if(Ember.$("#"+id+"license").hasClass('adsDanger')){
                Freezer.on();
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vconfiguration.please_license'], "Freezer.off()");
                return;
            }else if(elementArray1.length<=0){
                Freezer.on();
                Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb['rmp.virtual.vconfiguration.please_enable'], "Freezer.off()");
                return;
            }else{
            var serverids = this.get('controllers.application');
            serverids.set("serverids", id);
            serverids.set("selectedenvironment", this.get("selectedenvironmentfilter"));
            navigate('vbackup'); 
            }
            

        },
        loaderDataSetter: function() {
            var data = {
                imgSrc: "../../images/common/rmp-loading.gif",
                loadingText: ""
            };
            Mapper.getCell('spinnerWheel').setData(data);
        },
        refreshConfiguration: function(id) {
            var type, serverid;
            var virtualEnvironment = this.get("selectedenvironmentfilter");
            var isScvmmChildHost = false;
            if(id.indexOf("hostref_") != -1){
                type = "2";
                serverid = id.substring(8, id.length);
                isScvmmChildHost = true;
            }
            else{
            type = id.charAt(0);
            serverid = id.substring(4, id.length);
            }

            var apiUrl = '/virtualConfiguration.do?methodToCall=refreshServerDetails'; //NO I18N
            var Dobject = {
                operation: "refreshServerDetails",
                serverdetails: [{
                    virtualEnvironment:virtualEnvironment,
                    serverid: serverid,
                    type: type
                }]
            };
            //var objects = serverReq(apiUrl, Dobject, false);
            Freezer.on();
            Ember.$("#spinnerWheel").removeClass("rmpHide");
            var _this = this;
            testreq(apiUrl, Dobject).done(function(data) {
                if (data == undefined) {
                    if(!isScvmmChildHost){
                    Freezer.off();
                    }
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    Notify.show(jsRb['rmp.common.virtual.request_could_not_be_processed'], 2);
                } else if (data.hasOwnProperty("errorCode")) {
                    if(!isScvmmChildHost){
                        Freezer.off();
                        Ember.$("#spinnerWheel").addClass("rmpHide");
                        Notify.show(data.errorMsg, 2);
                        _this.send("serverViewInput");
                    }
                    else{
                        Ember.$("#spinnerWheel").addClass("rmpHide");
                        Notify.show(data.errorMsg, 2);
                    }
                } else {
                    if(!isScvmmChildHost){
                        Freezer.off();
                        Ember.$("#spinnerWheel").addClass("rmpHide");
                        _this.send("serverViewInput");
                        Notify.show(jsRb['rmp.virtual.vconfiguration.configuration_update_completed']);
                    }
                    else{
                        Ember.$("#spinnerWheel").addClass("rmpHide");
                        Notify.show(jsRb['rmp.virtual.vconfiguration.configuration_update_completed']);      
                    }
                }
            });

            this.send("serverViewInput");
        },
        serverforwardaction: function() {
            this.set("serverrangestart", this.get("serverrangestart") + this.get("limit"));
            var rangestart = this.get("serverrangestart");
            var limit = this.get("limit");
            var totalcount = this.get("servertotalcount");
            if (rangestart + limit > totalcount) {
                this.set("limit", totalcount - rangestart + 1);
            }
            this.send("serverViewInput");
        },
        serverbackwardaction: function() {
            var rangestart = this.get("serverrangestart");
            this.set("limit", 10);
            var limit = this.get("limit");
            var totalcount = this.get("servertotalcount");
            this.set("serverrangestart", rangestart - limit);
            this.send("serverViewInput");
        },
        scvmmHostViewInput: function(serverid, isconfigured){
            //var serverid = id.substring(12, id.length);
            var Dobject = {
                "operation": "getScvmmHostDetails",
                "serverid": serverid,
                "isconfiguredonly": isconfigured
                };
                var apiUrl = '/virtualConfiguration.do?methodToCall=getScvmmHostDetails'; //NO I18N
                var objects = serverReq(apiUrl, Dobject, false);
                this.send("bringfrontselecthostpopup", objects);
        },
        scvmmConfiguredHostViewInput: function(id){
            var serverid = id.substring(17, id.length);
            this.send("scvmmHostViewInput",serverid,"true");
        },
        scvmmAllHostViewInput: function(id){
            var serverid = id.substring(12, id.length);
            this.send("scvmmHostViewInput",serverid,"false");
        },
        serverViewInput: function(caller) {
            var Dobject = {
                "operation": "getServers",
                "serverids": [],
                "limit": this.get("limit"),
                "rangestart": this.get("serverrangestart"),
                "virtualEnvironment": this.get("selectedenvironmentfilter")
            };
            var apiUrl = '/virtualConfiguration.do?methodToCall=getServers'; //NO I18N
            var objects = serverReq(apiUrl, Dobject, false);
            var serverdetails = objects;
            var servers = serverdetails.serverdetails.servers;

            
            for(var i=0; i< servers.length; i++){
                var newObj = servers[i];
                var pushFlag = true;
                for(var j=0; j<c.virtualServers.length; j++){
                    var oldObj = c.virtualServers[j];
                    if(newObj.serverid == oldObj.serverid){
                        pushFlag = false;
                        break;
                    }
                }
                if(pushFlag){
                    c.virtualServers.push(newObj);
                }
            }
            //c.virtualServers=servers;

            var totalcount = serverdetails.serverdetails.total;
            this.set("servertotalcount", totalcount);
            var serverList = {};

            var columnHide = " rmpHide";
            var disableIconHide = "";
            var virtualEnvironment = this.get("selectedenvironmentfilter");
            if( virtualEnvironment == "2")
            {
                columnHide = "";
                disableIconHide = " rmpHide";
            }

            var navRight = "navRight";
            var navLeft = "navLeft";
            var counter = (this.get("limit") + this.get("serverrangestart") - 1);
            if (totalcount <= this.get("serverrangestart") + this.get("limit") - 1) {
                navRight = "navRight disableDiv";
                counter = totalcount;
            }
            var serverrangestart = this.get("serverrangestart");
            if (this.get("serverrangestart") - this.get("limit") < 1) {
                var navLeft = "navLeft disableDiv";
            }

            if (totalcount == 0) {
                serverrangestart = 0;
            }
            var tr = [{
                id: "tr1",
                style: "height:25px",
                th: [{
                    id: "",
                    colspan: "7",
                    style: "",
                    rowValue: [{
                        id: "serverforward",
                        class: " adsflRight cursorPointer " + navRight,
                        divAction: "serverforwardaction"
                    }, {
                        id: "serverbackward",
                        class: " adsflRight cursorPointer " + navLeft,
                        divAction: "serverbackwardaction"
                    }, {
                        class: "adsflRight",
                        value: (serverrangestart) + " - " + counter + " of " + totalcount
                    }]
                }]
            }, {
                id: "th1",
                class: "tableHeader",
                th: [{
                    id: "action",
                    class: "w10",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        i18nText: true,
                        value: "rmp.virtual.vconfiguration.action"
                    }]
                }, {
                    id: "server",
                    style: "width:15%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        i18nText: true,
                        value: "rmp.virtual.vconfiguration.servername"
                    }]
                },
					{
                    id: "fullName",
                    style: "width:15%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        
                        value: "Name"
                    }]
                },{
                    id: "configuredhosts",
                    style: "width:9%;",
                    rowValue: [{
                        id: "",
                        class: "truncate" + columnHide,
                        style: "padding-left:5px;",
                        i18nText: false,
                        value: "Configured Hosts"
                    }]
                }, {
                    id: "numberofvms",
                    style: "width:10%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        value: jsRb['rmp.virtual.vconfiguration.no_of_vms']
                    }]
                }, {
                    id: "user",
                    style: "width:15%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        i18nText: true,
                        value: "rmp.virtual.vconfiguration.username"
                    }]
                }, {
                    id: "licenser",
                    style: "width:15%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        value: jsRb['rmp.virtual.vconfiguration.license_information']
                    }]
                }, {
                    id: "status",
                    style: "width:20%;",
                    rowValue: [{
                        id: "",
                        class: "truncate",
                        style: "padding-left:5px;",
                        i18nText: true,
                        value: "rmp.virtual.vconfiguration.status"
                    }]
                }]
            }];
            var no_data_available = false;
            if (servers.length > 0) {
                for (var i = 0; i < servers.length; i++) {
                    var obj = servers[i];
                    var serverid = obj.serverid;
                    var servername = obj.servername;
                    var username = decodeURIComponent(obj.username);
                    var vmcount = obj.vmcount;

                    var islicensed = obj.islicensed;
                    var islicensedcount = obj.islicensedcount;
                    var totalvspherecount = obj.totalcount;
                    var type = obj.type;

                    var cpuSockets = obj.cpusockets;

                    var licenseObject = LicenseDetailsMaker(type, islicensed, islicensedcount, totalvspherecount);
                    var licenseClass = licenseObject.licenseClass;
                    var licenseDetails = licenseObject.licenseDetails;

                    var status = obj.status;
                    var configurationstatus = obj.configurationstatus
                    var isdisabled = obj.isdisabled;
                    var enabledisabletitle = jsRb['rmp.virtual.vconfiguration.enable_server'];
                    var enableDisableIcon = "disableIcon";
                    var disableDiv=" disableDiv";
                    var isconfiguredcount = obj.isConfiguredCount;
                    var standAlone = "";
                    var standAloneClass = " cursorPointer linkcolor ";
                    var standAloneAction = "scvmmConfiguredHostViewInput";
                    var typeClass = "vcenter";
                    var typeTitle = jsRb['rmp.virtual.vconfiguration.vcenter'];
                    if( virtualEnvironment == "2"){
                        typeTitle = "SCVMM";
                        typeClass = "scvmmIcon";
                    }
                    if (type == 2) {
                        typeClass = "esx";
                        typeTitle = jsRb['rmp.virtual.vconfiguration.esx_host'];
                        if( virtualEnvironment == "2"){
                            typeTitle = "Hyper-V host";
                        }
                        standAlone = " rmpHide";
                        standAloneClass = "";
                        standAloneAction = "";
                        
                    }
                    if (isdisabled == false) {
                        enableDisableIcon = "enableIcon";
                        enabledisabletitle = jsRb['rmp.virtual.vconfiguration.disable_server'];
                        disableDiv="";
                    }
                    var statusClass = " ";
                    var statusText = " ";
                    var hidelinkClass = " rmpHide ";

                    var confstatusClass = " rmpHide ";

                    if (configurationstatus == "1") {
                        //refresh success
                        var confstatusClass = " rmpHide ";
                    } else {
                        //refresh failed
                        var confstatusClass = " ";
                    }


                    switch (status) {
                        case "0":
                            //not configured
                            statusClass = " adsDanger ";
                            statusText = jsRb['rmp.virtual.vconfiguration.backup_not_configured'];
                            hidelinkClass = " ";
                            break;
                        case "1":
                            //configured
                            statusClass = " ";
                            statusText = jsRb['rmp.virtual.vconfiguration.backup_configured'];
                            hidelinkClass = " rmpHide ";
                            break;

                    };

                    serverList = {
                        id: type + "_row" + serverid,
                        class: "whiteBg border_bottom",
                        style: "height:25px;",
                        th: [{
                            id: "",
                            class: "w10",
                            rowValue: [{
                                id: type + "edit_" + serverid,
                                class: "truncate adsflLeft editIcon "+disableDiv,
                                style: "margin-top:5px",
                                title: jsRb['rmp.virtual.vconfiguration.edit_configuration'],
                                value: "",
                                divAction: "editserverpopupfill"
                            }, {
                                id: type + "ref" + serverid,
                                class: "truncate adsflLeft refreshIcon "+disableDiv,
                                style: "margin-top:5px;padding-bottom:2px",
                                title: jsRb['rmp.virtual.vconfiguration.refresh_configuration'],
                                value: "",
                                divAction: "refreshConfiguration"
                            }, {
                                id: type + "disable_" + serverid,
                                class: "truncate adsflLeft " + enableDisableIcon + disableIconHide,
                                style: "margin-top:5px",
                                title: enabledisabletitle,
                                divAction: "disableenableServer",
                                value: ""
                            },
                            {
                               id: type+"delete_" + serverid,
                               style: "margin-top:5px;",
                               title: jsRb['rmp.virtual.vconfiguration.delete_server'],
                               class: "truncate adsflLeft deleteIcon",
                               divAction: "deleteServer",
                               value: ""
                           }]
                        }, {
                            id: "",
                            style: "width:15%;",
                            title: typeTitle,
                            class: "",
                            rowValue: [{
                                id: "",
                                title: typeTitle,
                                class: "truncate adsflLeft " + typeClass,
                                value: ""
                            }, {
                                id: type + "servername" + serverid,
                                style: "padding-left:5px;display:inline-block;",
                                class: "truncate",
                                value: servername
                            }]
                        }, 
						
						{
                            id: "",
                            style: "width:10%;",
                            rowValue: [{
                                id: type + "_configuredcount" + serverid,
                                style: "margin-left:5px;",
                                title: "List of Configured Hosts",
                                class: "truncate adsinlineAndBlock "+ standAloneClass + columnHide,
                                value: isconfiguredcount,
                                divAction: standAloneAction
                            },{
                                id: "",
                                style: "padding-left:5px;",
                                class: "truncate adsinlineAndBlock" + columnHide + standAlone,
                                value: "out of"
                            },{
                                id: type + "_totalcount" + serverid,
                                style: "padding-left:5px;",
                                title: "List of Available Hosts",
                                class: "truncate adsinlineAndBlock linkcolor cursorPointer" + columnHide + standAlone,
                                value: totalvspherecount,
                                divAction: "scvmmAllHostViewInput"
                            }]
                        }, {
                            id: "",
                            style: "width:10%;",
                            rowValue: [{
                                id: type + "_vmcount" + serverid,
                                style: "padding-left:5px",
                                title: jsRb['rmp.dashboard.virtual.list_of_vms'],
                                class: "truncate linkcolor cursorPointer ",
                                value: vmcount,
                                divAction: "vmViewInput"
                            }]
                        }, {
                            id: "",
                            style: "width:15%;",
                            rowValue: [{
                                id: "",
                                style: "padding-left:5px;max-width:220px;",
                                title: username,
                                class: "truncate",
                                value: username
                            }]
                        }, {
                            id:"",
                            style: "width:15%;",
                            rowValue: [{
                                id: type + "conf" + serverid+"license",
                                style: "padding-left:5px;",
                                class: "truncate " + licenseClass,
                                value: licenseDetails
                            }]
                        }, {
                            id: "",
                            style: "width:20%;",
                            rowValue: [{
                                id: type + "upd" + serverid,
                                style: "margin-left:5px;",
                                title: jsRb['rmp.virtual.vconfiguration.retry_refresh'],
                                class: "truncate adsinlineAndBlock adswarningIcon cursorPointer" + confstatusClass,
                                value: "",
                                divAction: "refreshConfiguration"
                            }, {
                                id: "",
                                style: "padding-left:5px;",
                                class: "truncate adsinlineAndBlock " + statusClass,
                                value: statusText
                            }, {
                                id: type + "conf" + serverid,
                                style: "padding-left:5px;",
                                title: jsRb['rmp.virtual.vconfiguration.backup_status'],
                                class: "truncate adsinlineAndBlock linkcolor cursorPointer " + hidelinkClass,
                                value: jsRb['rmp.virtual.vconfiguration.configure_now'],
                                divAction: "configurenow"
                            }]
                        }]
                    };
                    tr.push(serverList);

                }
            } else {

                no_data_available = true;
                serverList = {
                    id: "",
                    class: "whiteBg border_bottom",
                    style: "height:100px;",
                    th: [{
                        id: "",
                        class: "",
                        colspan: "7",
                        rowValue: [{
                            style: "text-align:center;",
                            i18nText: true,
                            value: "rmp.admin.technicians.no_data_available"
                        }]
                    }]
                };
                tr.push(serverList);

            }
            var tableRow = {
                id: "tabler",
                style: "width:100%;border: 1px solid;border-color:#e8e8e8;",
                class: "tableOuter rmptableRow",
                cellspacing: "0",
                tbody: {
                    id: "tbo",
                    class: "",
                    tr: tr
                }
            };
            var data = {
                row: tableRow
            };

            Mapper.getCell('serverView').setData(data);

            Ember.run.schedule("afterRender", this, function() {
                if (no_data_available && caller != "cancel") {
                    this.send("setnewdropdownFromFilter");
                    Ember.$("#addserverDiv").removeClass("rmpHide");
                    Ember.$('#addServer-btn').addClass('rmpHide');
                    Ember.$("#serverDiv").addClass("rmpHide");
                    Ember.$("#licenseMgmt-btn").addClass("rmpHide");
                    Ember.$('#environment-label').addClass('rmpHide');
                    Ember.$('#environmentFilter').addClass('rmpHide');
                } else if(caller == "cancel"){
                    Ember.$("#addserverDiv").addClass("rmpHide");
                    Ember.$('#addServer-btn').removeClass('rmpHide');
                    Ember.$("#serverDiv").removeClass("rmpHide");
                    Ember.$("#licenseMgmt-btn").removeClass("rmpHide");
                    Ember.$('#environment-label').removeClass('rmpHide');
                    Ember.$('#environmentFilter').removeClass('rmpHide');
                }
                //for is licensed check to hide or show license management popup during startup.
                var Dobject = {
                        operation:"checkIsLicensed"
                      };
                var apiUrl = '/virtualConfiguration.do?methodToCall=checkIsLicensed';
                var objects = serverReq(apiUrl, Dobject,false);
                if(objects.status == true){
                  //alert("in");
                  if (!this.get("disablelicensepopup")) { //bring it up automatically only the first time
                            this.send('toggleLicenseMgmt', 'isLicensed');
                        }
                }
                //check ends
            });

        },
        backbtn: function() {
            this.set("vmViewrangestart", 1);
            this.set("vmViewvmcount", 0);
            this.set("limit", 10);
            this.set("selectedserverid", 0);
            this.set("selectedservertype", 0);
            Mapper.getCell('serverdropdown').deleteData();
            Ember.$('#serverDiv').removeClass('rmpHide');
            Ember.$('#vmDiv').toggleClass('rmpHide');
            Ember.$('#addServer-btn').removeClass('rmpHide');
            Ember.$('#select_server_label').toggleClass('rmpHide');
            Ember.$('#back-btn').addClass('rmpHide');
            Ember.$('#serverdropdown').addClass('rmpHide');
            Ember.$('#licenseMgmt-btn').toggleClass('rmpHide');
            this.send("serverViewInput");
        },
       //for license management start
        licenseMgmtpopupFill: function(){
            this.set('isChangeOccured',false);
          var Dobject = {
                  operation:"populateServerDropdown",
                  requestpage: "vlicensemgt",
                  virtualEnvironment: -1
                   };
          var apiUrl = '/virtualConfiguration.do?methodToCall=populateServerDropdown'; //NO I18N
          var objects = serverReq(apiUrl, Dobject, false);
          var vSpheres =[];
          var vsphereid,hostname,islicensed,cpusockets,virtualenvironment;
          var Dobject = {
                  operation:"getLicensedHosts"
                   };
          var apiUrl = '/virtualConfiguration.do?methodToCall=getLicensedHosts'; //NO I18N
          var licenseInfo = serverReq(apiUrl, Dobject, false);
          this.set("licensedHostsCount",licenseInfo.NumberOfHosts); //NO I18N
          var showInfoClass = ""; //NO I18N
          if(!licenseInfo.hasOwnProperty("showInfo")){ //NO I18N
              showInfoClass = "rmpHide"; //NO I18N
          }
          var LicensedHosts = 0;
          var usedHosts = 0;
          var availableHosts = 0;
          
          for(i=0;i<objects.spandata.length;i++){
            var server = objects.spandata[i];
            if(server.type == 2){
              vsphereid = server.id.substring(5,server.id.length);
              hostname = server.value;
              cpusockets = server.cpusockets;
              islicensed = server.islicensed;
              virtualenvironment = server.virtualEnvironment;
              vSpheres.push({vsphereid:vsphereid,hostname:hostname,islicensed:islicensed,cpusockets:cpusockets,virtualenvironment});
            }else{
              for(var j=0;j<server.subdata.length;j++){
                vsphereid = server.subdata[j].id.substring(5,server.subdata[j].id.length);
                hostname = server.subdata[j].subname + " (" + server.value + ")";
                cpusockets = server.subdata[j].cpusockets;
                islicensed = server.subdata[j].islicensed;
                virtualenvironment = server.subdata[j].virtualEnvironment;
                vSpheres.push({vsphereid:vsphereid,hostname:hostname,islicensed:islicensed,cpusockets:cpusockets,virtualenvironment});
              }
            }
          }
          var availableServers = [];
          var selectedServers = [];
          var saveButtonDisable = "";
          for(i=0;i<vSpheres.length;i++){
            if(vSpheres[i].islicensed == false){
              availableServers.push(vSpheres[i]);
            }
            else{
              selectedServers.push(vSpheres[i]);
              usedHosts++;
            }
          }
          if(licenseInfo !== null){
            LicensedHosts = licenseInfo.NumberOfHosts;
            if(LicensedHosts == 0){
                saveButtonDisable = " disableDiv";
            }
            if(LicensedHosts == -1){
              availableHosts = "unlimited";
            }else{
              availableHosts = LicensedHosts - usedHosts;
            }
          }
          Ember.$('#usedSockets').text(usedHosts);
          Ember.$('#availableSockets').text(availableHosts);
          this.set("availableServers",availableServers);
          this.set("selectedServers",selectedServers);
          this.set("availableServersTemp",availableServers.slice(0)); //copying entire list to temp buffer
          this.set("selectedServersTemp",selectedServers.slice(0)); //copying entire list to temp buffer
          this.set("previousselectedServers",selectedServers.slice(0));
          var tablebox = {"name": "availableServersTable","dim": [10, 0, 253, 200],"fixed": [true, true],
          "comp":{"type": "dynamic","name": "ui-table","data": true,"attributes": [{"type": "style","value": "position:relative;max-height:150px;overflow-y:auto;border: 1px solid;border-color:#e8e8e8;"}]},
          "actions": [{"type": "didInsertElement","method": "availableServersFiller","params": availableServers}]};
          var availableServersTableinsert = [{id: "",uiFramework: true,compData: JSON.stringify(tablebox)}];
          tablebox = {"name": "addedServersTable","dim": [345, -210, 253, 200],"fixed": [true, true],
          "comp":{"type": "dynamic","name": "ui-table","data": true,"attributes": [{"type": "style","value": "position:relative;max-height:150px;overflow-y:auto;border: 1px solid;border-color:#e8e8e8;"}]},
          "actions": [{"type": "didInsertElement","method": "addedServersFiller","params":selectedServers}]};
          availableServersTableinsert.push({id:"addServer",divAction:"addServers",value:">>",title:jsRb['rmp.domainsettings.Add'],style:"position:relative;top:-140px;left:270px;",class:"adsinlineAndBlock adsthemeButtonSmall adswhiteSpace adsmargin5 deselectComponent disableDiv"});
          availableServersTableinsert.push({id:"removeServer",divAction:"removeServers",value:"<<",title:jsRb['rmp.virtual.vconfiguration.remove'],style:"position:relative;top:-100px;left:200px;",class:"adsinlineAndBlock adsgrayButtonSmall adswhiteSpace adsmargin5 deselectComponent disableDiv"});
          availableServersTableinsert.push({id: "",uiFramework: true,compData: JSON.stringify(tablebox)});
          var tr=[{id:"",class:"adspopUpTopBand adsblackFnt adspadding5",
                        th:[{id:"",colspan:"2",class:"",rowValue:[{style:"font-weight:bold;",value:jsRb['rmp.virtual.vconfiguration.license_management'],class:"adsflLeft adsblackFnt"},{id:"",value:"",class:"adsflRight adspopupDivClose",divAction:"toggleLicenseMgmt"}]}
                        ]},
                  {id:"",class:"",style:"height:30px;",
                        th:[{id:"",class:"",style:"width:350px;padding-left:15px;",rowValue:[{style:"font-weight:bold;",value:jsRb['rmp.virtual.vconfiguration.available_hosts_colon'],class:"adsflLeft adsblackFnt"},{id:"availableSockets",style:"padding-left:5px;",value:availableHosts,class:"adsinlineAndBlock adsblackFnt"},{id:"freeLicenseInfo",class: "truncate adsflRight small-info " + showInfoClass,value: "",title: jsRb['rmp.virtual.vconfiguration.freehost_license_info'],style: "position:relative;left:-220px;top:1px;"}]},//NO I18N
                            {id:"",class:"",rowValue:[{id:"rmpLink",value:jsRb['rmp.virtual.vconfiguration.know_more'],style:"position:relative;top:6px;left:-220px;",class:"linkcolor cursorPointer " + showInfoClass,divAction:"openRMPpage"},{style:"position:relative;top:-5px;font-weight:bold;margin-left:-20px;",value:jsRb['rmp.virtual.vconfiguration.used_hosts_colon'],class:"adsblackFnt adsinlineAndBlock"},{id:"usedSockets",style:"position:relative;top:-5px;",value:usedHosts,class:"adsblackFnt adsinlineAndBlock"}]}//NO I18N
                        ]},
              {id:"",class:"adsmargin10",
                        th:[{id:"",class:"adsinlineAndBlock adsflLeft adspadding5",style:"height:180px;",rowValue:availableServersTableinsert} 
                        ]},
              {id:"",class:"adsmargin10",
                        th:[{id:"",colspan:"2",style:"position:relative;top:-20px;left:20px;",class:"adsinlineAndBlock adsflLeft adspadding5",rowValue:[{id:"isRemoveBackups",style:"position:relative;top:-4px;",class:"truncate ico14x14 level0 unchecked adsmargin3 adsflLeft rmpHide",divAction:"isRemoveBackupsCheck"},
                                      {id:"isRemoveBackupText",class:"adsblackFnt rmpHide",style:"width:350px;",value:jsRb['rmp.virtual.vconfiguration.delete_previous_backups']}]}
                        ]},
              {id:"",class:"adsmargin10",
                        th:[{id:"",colspan:"2",style:"position:relative;top:-15px;left:225px;",class:"adsinlineAndBlock adsflLeft adsValignTop msg",rowValue:[{id:"",divAction:"saveLicenseInfo",value:jsRb['rmp.common.Save'],title:jsRb['rmp.common.Save'],class:"adsinlineAndBlock adsthemeButtonSmall adswhiteSpace adsmargin5 deselectComponent" +saveButtonDisable},
                                                                      {divAction:"toggleLicenseMgmt",value:jsRb['rmp.common.Cancel'],title:jsRb['rmp.common.Cancel'],class:"adsinlineAndBlock adsgrayButtonSmall adswhiteSpace adsmargin5 deselectComponent" +saveButtonDisable}]}
                                                                  ]}
                        ];
          var tableRow={id:"licenseMgmtpopupBody",class:"popup popupAlert adsfntFamily adsfntSize adsgrayfont popupW500",style:"height:300px;width:625px;",
                   tbody:{id:"",class:"rmptableRow",
                    tr:tr
                   }
              };
          var data={row:tableRow};
          Mapper.getCell('licenseMgmtpopup').setData(data);
          Ember.$('#licenseMgmtpopup').toggleClass('rmpHide');
        },
        openRMPpage: function(){
            window.open('https://www.manageengine.com/ad-recovery-manager/','_blank');//NO I18N
        },
        isRemoveBackupsCheck: function(){
          if(Ember.$('#isRemoveBackups').hasClass('unchecked')){

            Ember.$('#isRemoveBackups').removeClass('unchecked').addClass('checked');
          }else{
            Ember.$('#isRemoveBackups').removeClass('checked').addClass('unchecked');
          }
        },
        availableServersFiller: function(objects){
            Mapper.getCell('availableServersTable').deleteData();
          var serverList = objects;
          var serverCount = serverList.length;
          var serverListContent;
          var tr = [{id:"",class:"whiteBg adsBold adsblackFnt grayBg",style:"height:20px;width:115px;",
              th:[{id:"",style:"width:200px;",rowValue:[{id:"",class:"truncate",style:"",value:jsRb['rmp.virtual.vconfiguration.available_servers']}]}
                ]}];
          if(serverCount == 0){
            serverListContent = {id:"",class:"whiteBg adsblackFnt",style:"height:32px;",
                      th:[{id:"",style:"",colspan:2,rowValue:[{id:"",style:"text-align:center;",class:"",value:jsRb['rmp.admin.technicians.no_data_available']}]}
                      ]};
            tr.push(serverListContent);
          }
          else{
            for(i=0;i<serverCount;i++){
              if(serverList[i] !== undefined ){
              var typeTitle = "VMware";
              var typeClass = "vcenter";
              if(serverList[i].virtualenvironment == "Hyper-V"){
                typeTitle = "Hyper-V";
                typeClass = "scvmmIcon";
              }
              serverListContent = {id:"server_"+serverList[i].vsphereid,class:"whiteBg adsblackFnt cursorPointer",style:"height:32px;",rowAction:"addServerTemp",
                        th:[{id:"",style:"",rowValue:[{id: "",style:"margin-left:5px;",title: typeTitle,class: "adsinlineAndBlock truncate adsflLeft " + typeClass,value: ""},{id:"serverDiv_"+serverList[i].vsphereid,style:"padding-left:5px;width:180px;",class:"adsinlineAndBlock truncate",value:serverList[i].hostname}]}
                        ]};
              }
              tr.push(serverListContent);
            }
          }
          var tableRow={id:"serverListPopuBody",class:"",style:"width:100%;",cellspacing:"0",
                  tbody:{id:"serverListtableBody",class:"",
                      tr:tr
                      }
                };
          var data={row:tableRow};
          
               Ember.$('#addServer').addClass('disableDiv');
               Ember.run.schedule("afterRender",function(){
                    Mapper.getCell('availableServersTable').setData(data);
               });
        },
        addedServersFiller: function(objects){
             Mapper.getCell('addedServersTable').deleteData();
          var serverList = objects;
          var serverCount = serverList.length;
          var serverListContent;
          var tr = [{id:"",class:"whiteBg adsBold adsblackFnt grayBg",style:"height:20px;",
              th:[{id:"",style:"width:200px;",rowValue:[{id:"",class:"truncate",style:"",value:jsRb['rmp.virtual.vconfiguration.licensed_servers']}]}
                ]}];
          if(serverCount == 0){
            serverListContent = {id:"",class:"whiteBg adsblackFnt",style:"height:32px;",
                      th:[{id:"",style:"",colspan:2,rowValue:[{id:"",style:"text-align:center;",class:"",value:jsRb['rmp.admin.technicians.no_data_available']}]}
                      ]};
            tr.push(serverListContent);
          }
          else{
            for(i=0;i<serverCount;i++){
              if(serverList[i] !== undefined ){
              var typeTitle = "VMware";
              var typeClass = "vcenter";
              if(serverList[i].virtualenvironment == "Hyper-V"){
                typeTitle = "Hyper-V";
                typeClass = "scvmmIcon";
              } 
              serverListContent = {id:"server_"+serverList[i].vsphereid,class:"whiteBg adsblackFnt cursorPointer",style:"height:32px;",rowAction:"removeServerTemp",
                        th:[{id:"",style:"",rowValue:[{id: "",style:"margin-left:5px;",title: typeTitle,class: "adsinlineAndBlock truncate adsflLeft " + typeClass,value: ""},{id:"serverDiv_"+serverList[i].vsphereid,class:"truncate",style:"padding-left:5px;width:180px;",value:serverList[i].hostname}]}
                        ]};
              }
              tr.push(serverListContent);
            }
          }
            var tableRow={id:"serverListPopuBody",class:"",style:"width:100%",cellspacing:"0",
                    tbody:{id:"serverListtableBody",class:"",
                        tr:tr
                        }
                  };
            var data={row:tableRow};
            
               Ember.$('#removeServer').addClass('disableDiv');
            Ember.run.schedule("afterRender",function(){
            Mapper.getCell('addedServersTable').setData(data);
            });
        },
        addServerTemp: function(id){
            
         if(this.get("licensedHostsCount")==0){
            Freezer.bringFront();
            Popup.alert(i18n.Popup.msgTypes.error, jsRb['rmp.virtual.vconfiguration.available_hosts_are_not_enough'], "Freezer.sendBack()");
            return;
        }
        if(!Ember.$('#removeServer').hasClass('disableDiv')){
            //check for selected servers in licensed servers
            return;
        }
            id = id.substring(7,id.length);
            var availableServers = this.get('availableServersTemp');
            var selectedServers = this.get('selectedServersTemp');
            var count = 0;
              for(i=0;i<availableServers.length;i++){
                  if(availableServers[i].vsphereid == id){
                    if(!Ember.$('#server_'+availableServers[i].vsphereid).hasClass("blueBg")){
                      Ember.$('#server_'+availableServers[i].vsphereid).addClass("blueBg");
                    }else{
                         Ember.$('#server_'+availableServers[i].vsphereid).removeClass("blueBg");
                    }
              }
            }
             
              for(var j=0;j<availableServers.length;j++){
                    if(Ember.$('#server_'+availableServers[j].vsphereid).hasClass("blueBg")){
                      count++;
                    }
              }
              //to enable or disable addServer button
              if(count>0){
                  Ember.$('#addServer').removeClass('disableDiv');
              }else{
                  Ember.$('#addServer').addClass('disableDiv');
              }
            },
        removeServerTemp: function(id){
        //to return if addServer button is enableDisableIcon
        if(!Ember.$('#addServer').hasClass('disableDiv')){
            //check for selected servers in available servers
            return;
        }
            id = id.substring(7,id.length);
            var availableServers = this.get('availableServersTemp');
            var selectedServers = this.get('selectedServersTemp');

            var count = 0;
              for(i=0;i<selectedServers.length;i++){
                  if(selectedServers[i].vsphereid == id){
                    if(!Ember.$('#server_'+selectedServers[i].vsphereid).hasClass("blueBg")){
                      Ember.$('#server_'+selectedServers[i].vsphereid).addClass("blueBg");
                    }else{
                      Ember.$('#server_'+selectedServers[i].vsphereid).removeClass("blueBg");   
                    }
                  }
              }
          
          for(i=0;i<selectedServers.length;i++){
                if(Ember.$('#server_'+selectedServers[i].vsphereid).hasClass("blueBg")){
                  count++;
                }
          }
          //to enable or disable removeServer button
          if(count>0){
              Ember.$('#removeServer').removeClass('disableDiv');
          }else{
              Ember.$('#removeServer').addClass('disableDiv');
          }
          //to enable or disable removeServer button
          if(count>0){
              Ember.$('#removeServer').removeClass('disableDiv');
          }else{
              Ember.$('#removeServer').addClass('disableDiv');
          }
          
        },
        addServers: function(){
          var availableServers = this.get('availableServersTemp').slice(0);
          var selectedServers = this.get('selectedServersTemp').slice(0);
            var temp = this.get('availableServersTemp').slice(0);
            for (var i = 0; i < temp.length; i++) {
                if  (Ember.$('#server_' + temp[i].vsphereid).hasClass("blueBg")) {
                    Ember.$('#server_' + temp[i].vsphereid).addClass("blueBg");
                    var selectServertemp = temp[i];
                    //to remove from availableServers
                    for(var j = 0; j < temp.length; j++){
                    if(availableServers[j].vsphereid == temp[i].vsphereid){
                        availableServers.splice(j, 1);
                        break;
                    }
                    }
                    selectedServers.push(selectServertemp);
                }
            }
            
            var usedHosts = selectedServers.length;
            var availableHosts=this.get("licensedHostsCount");
          //for(i=0;i<selectedServers.length;i++){
              //to update the sockets count
              if(availableHosts != -1){
                if(availableHosts == 0){
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.error, jsRb['rmp.virtual.vconfiguration.no_more_subscription_available'], "Freezer.sendBack()");
                    return;
                }else if(availableHosts < usedHosts){
                    Freezer.bringFront();
                    Popup.alert(i18n.Popup.msgTypes.error, jsRb['rmp.virtual.vconfiguration.available_hosts_are_not_enough'], "Freezer.sendBack()");
                    return;
                }else{
                  Ember.$('#addserver').removeClass('disableDiv');
                }
                availableHosts=this.get("licensedHostsCount")-selectedServers.length;
              }else{
                availableHosts="unlimited";
              }
              //updation of sockets count ends          
          //}
          this.set('availableServers', availableServers);
          this.set('selectedServers', selectedServers);
          this.set('isChangeOccured',true);
          Ember.$('#usedSockets').text(selectedServers.length);
          Ember.$('#availableSockets').text(availableHosts);
          this.set('availableServersTemp',availableServers);
          this.set('selectedServersTemp',selectedServers);
          this.send("availableServersFiller",availableServers);
          this.send("addedServersFiller",selectedServers);
        },
        removeServers: function(){
          this.send("confirmationPopupToggle","selected");
        },
        removeServersConfirmed: function(){
          this.send('confirmationPopupToggle');
          var availableServers = this.get('availableServersTemp').slice(0);
            var selectedServers = this.get('selectedServersTemp').slice(0);
            var temp = this.get('selectedServersTemp').slice(0);
            for (var i = 0; i < temp.length; i++) {
                if  (Ember.$('#server_' + temp[i].vsphereid).hasClass("blueBg")) {
                    Ember.$('#server_' + temp[i].vsphereid).addClass("blueBg");
                    var selectServertemp = temp[i];
                    //to remove from selectedservers
                    for(var j = 0; j < temp.length; j++){
                    if(selectedServers[j].vsphereid == temp[i].vsphereid){
                        selectedServers.splice(j, 1);
                        break;
                    }
                    }
                    availableServers.push(selectServertemp);
                }
            }
          this.set('availableServers',availableServers);
          this.set('selectedServers',selectedServers);
          this.set('isChangeOccured',true);
          //check sockets count
          var availableServers = this.get('availableServers');
          var selectedServers = this.get('selectedServers');
          var usedHosts = 0;
          var availableHosts = "unlimited";
          var availableHostsCount = Ember.$('#availableSockets').text();
          if(availableHostsCount != "unlimited"){
                availableHosts=availableHostsCount;
            }
          //to alert the user about the deletion of restore points.
            if(selectedServers.length == 0){
                Ember.$('#removeServer').addClass('disableDiv'); 
              }

              if(this.get("licensedHostsCount")==-1){
                Ember.$('#availableSockets').text("unlimited");
              }else{
                Ember.$('#availableSockets').text(this.get("licensedHostsCount")-selectedServers.length);
              }
            Ember.$('#usedSockets').text(selectedServers.length);
            Ember.$('#isRemoveBackups').removeClass("rmpHide");
            Ember.$('#isRemoveBackupText').removeClass("rmpHide");
            this.set('availableServersTemp',availableServers);
            this.set('selectedServersTemp',selectedServers);
          this.send("availableServersFiller",availableServers);
          this.send("addedServersFiller",selectedServers);
        },
        confirmationPopupToggle: function(serverName){
          if(Ember.$('#confirmationPopup').hasClass('rmpHide')){
            this.send('confirmationPopupFill',serverName);
            Ember.$('#licenseMgmtpopup').addClass('adsfreezeLayer');
            Ember.$('#confirmationPopup').removeClass('rmpHide');
          }else{
            Ember.$('#licenseMgmtpopup').removeClass('adsfreezeLayer');
            Ember.$('#confirmationPopup').addClass('rmpHide');
          }
        },
        confirmationPopupFill: function(serverName){
          var action = "removeServersConfirmed";
          var message = jsRb['rmp.virtual.vconfiguration.the_previous_backups_of'] +" "+ serverName + " "+jsRb['rmp.virtual.vconfiguration.server_cannot_be_restored'];//NO I18N
          if(serverName == jsRb['rmp.virtual.vconfiguration.unlicensed']){
            action = "saveLicenseInfoConfirmed";
          }else if(serverName == "noHostSelected"){//NO I18N
              message = jsRb['rmp.virtual.vconfiguration.no_server_licensed_message'];//NO I18N
              action = "saveLicenseInfoConfirmed";//NO I18N
          }


          var tr = [{
              id: "",
              class: "adspopUpTopBand adsblackFnt adspadding5",
              th: [{
                  id: "",
                  colspan: "2",
                  class: "",
                  rowValue: [{
                      style: "font-weight:bold;",
                      value: "Remove Server",
                      class: "adsflLeft adsblackFnt"
                  }, {
                      id: "",
                      value: "",
                      class: "adsflRight adspopupDivClose",
                      divAction: "confirmationPopupToggle"
                  }]
              }]
          }, {
              id: "",
              class: "adsmargin10",
              th: [{
                  id: "",
                  colspan: "2",
                  class: "adsinlineAndBlock adsflLeft adspadding5",
                  rowValue: [{
                      style: "",
                      class: "adsconfirmIcon"
                  }]
              }, {
                  id: "",
                  colspan: "2",
                  class: "adsinlineAndBlock adsflLeft adsValignTop msg",
                  rowValue: [{
                      style: "",
                      value: message,
                      class: "adsblockElement adsfontSize11 paddingTopBtm"
                  }, {
                      id: "yes",
                      divAction: action,
                      i18nText: true,
                      value: "rmp.common.Yes",
                      class: "adsinlineAndBlock adswhiteSpace adsmargin5 deselectComponent adsthemeButton"
                  }, {
                      divAction: "confirmationPopupToggle",
                      i18nText: true,
                      value: "rmp.common.No",
                      class: "adsinlineAndBlock adsgrayButton adswhiteSpace adsmargin5 deselectComponent"
                  }]
              }]
          }];
          var tableRow = {
              id: "disableornotpopupbody",
              class: "popup popupAlert adsfntFamily adsfntSize adsgrayfont",
              style: "",
              tbody: {
                  id: "",
                  class: "",
                  tr: tr
              }
          };
          var data = {
              row: tableRow
          };
          Mapper.getCell('confirmationPopup').setData(data);
        },
        toggleLicenseMgmt: function(id){
        if(id == "isLicensed"){
            Freezer.on();
            this.send('licenseMgmtpopupFill');
            Ember.$('#licenseMgmtpopup').removeClass('rmpHide');
          }else{
              this.set("disablelicensepopup", true);
            var Dobject = {
                    operation:"applyLicense",
                    isSave:false
                     };
            var apiUrl = '/virtualConfiguration.do?methodToCall=applyLicense'; //NO I18N
            //var objects = serverReq(apiUrl, Dobject, false);
            // if(objects.errorCode==401){
            // Freezer.off()
            // Freezer.on();
            // Popup.alert(i18n.Popup.msgTypes.invalidOperation, jsRb[objects.errorMsg], "Freezer.off()");
            // Ember.$('#licenseMgmtpopup').addClass('rmpHide');
            // return;
            // }else{
            // Freezer.off();
            // }
                testreq(apiUrl, Dobject).done(function(data) {
                if (data == undefined) {
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    Notify.show("Request could not be processed", 2);
                } else if (data.hasOwnProperty("errorCode")) {
                    Ember.$("#spinnerWheel").addClass("rmpHide");
                    if(data.errorCode!=401){
                    Freezer.on();
                    Popup.alert(i18n.Popup.msgTypes.invalidOperation,data.errorMsg,"Freezer.off()");
                    }
                }
                    //Notify.show(data.errorMsg, 2);
            });

            Freezer.off();
            Ember.$('#licenseMgmtpopup').addClass('rmpHide');
          }
        },
        saveLicenseInfo: function(){
            var selectedServers = this.get('selectedServersTemp');
                var availableServers = this.get('availableServersTemp');
                var isChangeOccured = this.get('isChangeOccured');
                if (this.get('selectedServersTemp').length == 0 && isChangeOccured) { //NO I18N
                    this.send('confirmationPopupToggle', "noHostSelected"); //NO I18N
                } else if (this.get("availableServersTemp").length > 0 && isChangeOccured) { //NO I18N
                    this.send('confirmationPopupToggle', "unlicensed"); //NO I18N
                } else {
                    this.set("disablelicensepopup", true);
                    this.send('saveLicenseInfoConfirmed', false); //NO I18N
                }

            
            //to check any licesened server is now unlicensed
            /*
            var previousSelectedServers = this.get("previousselectedServers");
            var newAvailableServers = this.get("availableServersTemp");
            var unlicenseOccured = false;
            for(var i=0; i<newAvailableServers.length;i++){
                for(var j=0;j<previousSelectedServers.length;j++){
                    if(newAvailableServers[i].vsphereid == previousSelectedServers[j].vsphereid){
                        unlicenseOccured =true;
                        break;
                    }
                }
                if(unlicenseOccured){
                    break;
                }
            }

            if(unlicenseOccured){//NO I18N
                this.send('confirmationPopupToggle',"unlicensed");//NO I18N
            }else if(this.get('selectedServersTemp').length == 0){
                this.send('confirmationPopupToggle',"noHostSelected");//NO I18N
            }else{
                this.send('saveLicenseInfoConfirmed',false);//NO I18N
            }
            */
        },
        saveLicenseInfoConfirmed: function(isToggleConfirmation){
          var selectedServers = this.get('selectedServersTemp');
          this.set('selectedServers',selectedServers);
          var newHostList = [];
          for(i=0;i<selectedServers.length;i++){
            newHostList.push(selectedServers[i].vsphereid);
          }
          var isRemoveBackups = false;
          if(Ember.$('#isRemoveBackups').hasClass('checked')){
            isRemoveBackups = true;
            }


          var Dobject = {
                  operation:"applyLicense",
                  newHostList:newHostList,
                  isRemoveBackups:isRemoveBackups,
                  isSave:true
                   };
          var apiUrl = '/virtualConfiguration.do?methodToCall=applyLicense'; //NO I18N
          //var objects = serverReq(apiUrl, Dobject, false);
          //this.send("serverViewInput");
        var _this=this;
        testreq(apiUrl, Dobject).done(function(data) {
        if (data == undefined) {
            Ember.$("#spinnerWheel").addClass("rmpHide");
            Notify.show("Request could not be processed", 2);//NO I18N
            return;
            } else if (data.hasOwnProperty("errorCode")) {
                if(isToggleConfirmation){
                    _this.send('confirmationPopupToggle');//NO I18N
                }
            Freezer.bringFront();
            Ember.$("#spinnerWheel").addClass("rmpHide");
            if(data.errorCode==401){
            Popup.alert(i18n.Popup.msgTypes.invalidOperation,jsRb[data.errorMsg],"Freezer.sendBack()");
            }else{
            Popup.alert(i18n.Popup.msgTypes.invalidOperation,data.errorMsg,"Freezer.sendBack()");
            }
        }else{
            if(isToggleConfirmation){
                _this.send('confirmationPopupToggle');//NO I18N
            }
        _this.send('toggleLicenseMgmt');//NO I18N
        _this.send("serverViewInput");  //NO I18N
        }

            });

        }
       //for license management end
    },
    init: function() {
        var _this = this;
        var vconfigurationDiv = {
            "name": "ROOTDIV",
            "dim": [20, 72, 966, 475],
            "fixed": [false, true],
            "comp": {
                "attributes": [{
                    "type": "style",
                    "value": ""
                }]
            },
            "children": [{
                "name": "back-btn",
                "dim": [300, 10, 186, 30],
                "classNames": ['adsflRight', 'addNewBtn', 'adsfntSize', 'adsfntFamily', 'rmpHide'],
                "fixed": [true, true],
                "comp": {
                    "name": "div",
                    "type": "HTML",
                    "attributes": [{
                        "type": "innerHTML",
                        "value": jsRb['rmp.rollback.Back']
                    }, {
                        "type": "style",
                        "value": "position:relative !important;width:auto;float:right;left:auto;"
                    }]
                },
                "actions": [{
                    "type": "click",
                    "method": "backbtn"
                }]
            }, {
                "name": "addserverDiv",
                "dim": [0, 0, 0, 155],
                "classNames": ['rmpHide'],
                "fixed": [true, true],
                "comp": {
                    "attributes": [{
                        "type": "style",
                        "value": "position:relative !important;width:100%;height:auto;"
                    }]
                },
                "children": [{
                    "name": "addserver-tbl",
                    "dim": [6, 0, 529, 225],
                    "comp": {
                        "type": "dynamic",
                        "data": true,
                        "name": "ui-table",
                        "attributes": [{
                            "type": "style",
                            "value": "position:relative !important;left:50%;margin-left:-255px;height:auto;"
                        }]
                    },
                    "actions": [{
                        "type": "didInsertElement",
                        "method": "serverInput"
                    }]
                }]
            }, {
                "name": "serverdropdown",
                "dim": [370, 15, 63, 30],
                "fixed": [true, true],
                "comp": {
                    "type": "dynamic",
                    "data": true,
                    "name": "ui-multidropdown",
                    "attributes": [{
                        "type": "style",
                        "value": ""
                    }]
                },
                "actions": [{
                    "type": "didInsertElement",
                    "method": ""
                }]
            }, {
                "name": "spinnerWheel",
                "dim": [0, 40, 186, 30],
                "classNames": ['rmpHide'],
                "fixed": [true, true],
                "comp": {
                    "type": "dynamic",
                    "data": true,
                    "name": "ct-loading",
                    "attributes": [{
                        "type": "style",
                        "value": "z-index:601;left:50%;top:45%;margin-left:-130px;"
                    }]
                },
                "actions": [{
                    "type": "didInsertElement",
                    "method": "loaderDataSetter"
                }]
            }, {
                "name": "environment-label",
                "dim": [0, 20, 120, 30],
                "classNames": ['adsflLeft'],
                "fixed": [true, true],
                "comp": {
                    "name": "span",
                    "type": "HTML",
                    "attributes": [{
                        "type": "innerHTML",
                        "value": "Virtual Environment : "
                    }]
                },
                "actions": [{
                    "type": "",
                    "method": ""
                }]
            }, {
                "name": "environmentFilter",
                "dim": [115, 15, 160, 30],
                "fixed": [true, true],
                "classNames": ["adsinlineAndBlock "],
                "comp": {
                    "type": "dynamic",
                    "data": true,
                    "name": "ui-multidropdown",
                    "attributes": [{
                            "type": "style",
                            "value": ""
                        }]
                },
                "actions": [{
                    "type": "didInsertElement",
                    "method": "populateenvironmentFilter"
                }]
            },{
                "name": "selecthostpopup",
                "dim": [0, 0, 625, 227],
                "fixed": [true, true],
                "comp": {
                    "type": "dynamic",
                    "name": "ui-table",
                    "data": true,
                    "attributes": [{
                        "type": "style",
                        "value": "left:50%;margin-left:-250px;width:auto;"
                    }]
                },
                "classNames": ["rmpHide"]
            },{
                "name": "confirmclosepopup",
                "dim": [0, 0, 529, 227],
                "fixed": [true, true],
                "comp": {
                    "data": true,
                    "type": "dynamic",
                    "name": "ui-table",
                    "attributes": [{
                        "type": "style",
                        "value": "left:50%;margin-left:-250px;"
                    }]
                },
                "classNames": ["rmpHide"]
            },{
                "name": "addServer-btn",
                "dim": [300, 10, 186, 30],
                "classNames": ['adsflRight', 'addNewBtn', 'adsfntSize', 'adsfntFamily'],
                "fixed": [true, true],
                "comp": {
                    "name": "div",
                    "type": "HTML",
                    "attributes": [{
                        "type": "innerHTML",
                        "value": jsRb['rmp.virtual.vconfiguration.add_new_server']
                    }, {
                        "type": "title",
                        "value": jsRb['rmp.virtual.vconfiguration.add_new_server']
                    }, {
                        "type": "style",
                        "value": "position:relative !important;width:auto;float:right;left:auto;"
                    }]
                },
                "actions": [{
                    "type": "click",
                    "method": "addServerBtn"
                }]
            },
            {
    "name": "licenseMgmt-btn","dim": [-8, 10, 186, 30],"classNames": ['adsflRight', 'addNewBtn', 'adsfntSize', 'adsfntFamily'],"fixed": [true, true],
    "comp": {"name": "div","type": "HTML","attributes": [{"type": "innerHTML","value": jsRb['rmp.virtual.vconfiguration.license_management']}, {"type": "title","value": jsRb['rmp.virtual.vconfiguration.manage_your_license']},{"type": "style","value": "position:relative !important;width:auto;float:right;"}]},"actions": [{"type": "click","method": "toggleLicenseMgmt","params":"isLicensed"}]
    },{
                "name": "serverDiv",
                "dim": [0, 10, 1085, 220],
                "fixed": [false, true],
                "comp": {
                    "attributes": [{
                        "type": "style",
                        "value": "position:relative;width:100%;float:right;"
                    }]
                },
                "children": [{
                    "name": "serverView",
                    "dim": [0, 10, 1085, 0],
                    "comp": {
                        "type": "dynamic",
                        "data": true,
                        "name": "ui-table",
                        "attributes": [{
                            "type": "style",
                            "value": "position:relative;height:auto;width:100%;float:right;"
                        }]
                    },
                    "actions": [{
                        "type": "didInsertElement",
                        "method": "serverViewInput"
                    }]
                }]
            }, {
                "name": "vmDiv",
                "dim": [0, 10, 1085, 220],
                "classNames": ['rmpHide'],
                "fixed": [false, true],
                "comp": {
                    "attributes": [{
                        "type": "style",
                        "value": "position:relative;width:100%;float:right;"
                    }]
                },
                "children": [{
                    "name": "vmView",
                    "dim": [0, 10, 1085, 0],
                    "comp": {
                        "type": "dynamic",
                        "data": true,
                        "name": "ui-table",
                        "attributes": [{
                            "type": "style",
                            "value": "position:relative;height:auto;width:100%;float:right;"
                        }]
                    },
                    "actions": [{
                        "type": "",
                        "method": ""
                    }]
                }]
            },
            {
    "name": "licenseMgmtpopup","dim": [0, -50, 620, 300],"fixed": [true, true],
    "comp": {"data": true,"type": "dynamic","name": "ui-table","attributes": [{"type": "style","value": "left:50%;margin-left:-300px;"}]},"classNames": ["rmpHide"]
    },{
    "name": "confirmationPopup","dim": [0, 0, 529, 227],"fixed": [true, true],
    "comp": {"data": true,"type": "dynamic","name": "ui-table","attributes": [{"type": "style","value": "left:50%;margin-left:-250px;"}]},"classNames": ["rmpHide"]
    },{
                "name": "disableornotpopup",
                "dim": [0, 0, 529, 227],
                "fixed": [true, true],
                "comp": {
                    "data": true,
                    "type": "dynamic",
                    "name": "ui-table",
                    "attributes": [{
                        "type": "style",
                        "value": "left:50%;margin-left:-250px;"
                    }]
                },
                "classNames": ["rmpHide"]
            }, {
                "name": "editserverpopup",
                "dim": [0, 0, 529, 227],
                "fixed": [true, true],
                "comp": {
                    "type": "dynamic",
                    "name": "ui-table",
                    "data": true,
                    "attributes": [{
                        "type": "style",
                        "value": "left:50%;margin-left:-250px;width:auto;"
                    }]
                },
                "classNames": ["rmpHide"]
            }, {
                "name": "select_server_label",
                "dim": [290, 20, 78, 20],
                "classNames": ["rmpHide"],
                "comp": {
                    "name": "span",
                    "type": "HTML",
                    "attributes": [{
                        "type": "innerHTML",
                        "value": jsRb['rmp.virtual.vconfiguration.select_server_colon']
                    }, {
                        "type": "style",
                        "value": "position:absolute;"
                    }]
                }
            }, {
                        "name": "quickBackupPopup",
                        "dim": [0, 0, 529, 227],
                        "fixed": [true, true],
                        "comp": {
                            "data": true,
                            "type": "dynamic",
                            "name": "ui-table",
                            "attributes": [{
                                "type": "style",
                                "value": "left:50%;margin-left:-250px;"
                            }]
                        },
                        "classNames": ["rmpHide"]
            }, {
                "name": "addstoragepopup",
                "dim": [0, 0, 529, 227],
                "fixed": [true, true],
                "comp": {
                    "type": "dynamic",
                    "name": "ui-table",
                    "data": true,
                    "attributes": [{
                        "type": "style",
                        "value": "left:50%;margin-left:-250px;width:auto;"
                    }]
                },
                "classNames": ["rmpHide"]
            }
            ]
        };

        this.set("servertotalcount", 0);
        this.set("serverrangestart", 1);
        this.set("disablelicensepopup", false);
        this.set("isChangeOccured",false);
        this.set("vmViewrangestart", 1);
        this.set("vmViewvmcount", 0);
        this.set("limit", 10);
        this.set("selectedserverid", 0);
        this.set("selectedservertype", 0);
        this.set("json", JSON.stringify(vconfigurationDiv)); //No I18N
        this.set("jsonreceived", true); //No I18N


        this.set("selectedconnectiontype", "Standalone");
        this.set("selectedenvironment", "2");//No I18N
        this.set("selectedenvironmentfilter", "2");//No I18N
        this.set("bufferhosts", {
            hosts: []
        });

        this._super();
    }
    });

    function serverReq(apiUrl, Dobject, isAsync) {
    var objects;
    serverReqAsync(apiUrl, Dobject, function(data) {
        try {
            objects = data;
        } catch (err) {
            if (data.indexOf("j_security_check") != -1) {
                location.reload();
            }
        }
    }, isAsync, true);
    return objects;
    }



    function LicenseDetailsMaker(type, islicensed, islicensedcount, totalvspherecount) {

    var licenseObject = {
        "licenseClass": "adsDanger",
        "licenseDetails": jsRb['rmp.virtual.vconfiguration.license_details_unavailable']
    };
    if (type == "2") {
        if (islicensed) {
            licenseObject.licenseClass = "";
            licenseObject.licenseDetails = jsRb['rmp.virtual.vconfiguration.licensed'];
        } else {
            licenseObject.licenseClass = "adsDanger";
            licenseObject.licenseDetails = jsRb['rmp.virtual.vconfiguration.license_not_applied'];
        }
    } else {
        if (islicensed) {
            licenseObject.licenseClass = "";
            if (totalvspherecount == islicensedcount) {
                licenseObject.licenseDetails = "All Hosts(" + islicensedcount + ") have been Licensed";
            } else {
                licenseObject.licenseDetails = islicensedcount + " of " + totalvspherecount + " hosts have been Licensed";
            }
        } else {
            licenseObject.licenseClass = "adsDanger";
            licenseObject.licenseDetails = jsRb['rmp.virtual.vconfiguration.license_not_applied'];
        }
    }

    return licenseObject;
    }


    function ValidateIPaddress(ipaddress) {  
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
        return (true)  
    }  
    return (false)  
    }  

    function testreq(url, data) {
    return $.ajax({
        type: "GET",
        async: true,
        contentType: true ? "application/json; charset=utf-8" : "text/html; charset=utf-8",
        dataType: "json",
        url: url,
        data: true ? "req=" + JSON.stringify(data) : data
    });
    }

