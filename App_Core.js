(function (global, undefined) {
    var appCore ={},
        hashChangeSupported = ('onhashchange' in window),
        consoleAssignSupported = true,
        consoleSupported = true,
        _console = ['log', 'info', 'warn', 'error', 'group', 'groupEnd' ];
    //preliminary checks for console support in various browsers
    if (typeof window.console != 'undefined') {
        appCore.log = console.log;
        try {
            appCore.log('Initializing logging...');
        } catch (e) {
            consoleAssignSupported = false;
        }
    }else{
        consoleSupported = false;
    }
    //preliminary checks for 'hashChange' event support. It's know for ie7 not to support hashchange,
    // however in doc compatibility mode it will still set it as supported. We need explicitly set
    // it to false for ie7
    if (navigator.appVersion.indexOf("MSIE 7.") != -1){
        hashChangeSupported = false;
    }

    if (!hashChangeSupported) {
        window.setInterval(function () {
            var currentHash = window.location.hash;
            if (previousHashValue !== currentHash) {
                for (var i in eventHandlers) {
                    eventHandlers[i].call(window);
                }
            }
            previousHashValue = currentHash;
        }, 50);
    }

    //AppCore variables
    var selectorEngine = (window.jQuery !== undefined)? window.jQuery: undefined,
        selectorEngineName = (window.jQuery !== undefined)? 'jquery': 'dom',
        _appRunning = false,
        moduleData = {},
        subscriptions = {},
        debug = false,
        data,
        randomizer=0,
        config ={},
        slice = [].slice,
        extensions = {},
        pages = [],
        isTouch = (function(){
            //Touch Support
            return ("ontouchstart" in window) || window.DocumentTouch && document instanceof DocumentTouch;
        })(),
        is3DSupport = (function(){
            // 3D Transforms Test
            var div = document.createElement('div');
            div.id = 'test3d';

            var s3d=false;
            if("webkitPerspective" in div.style) s3d=true;
            if("MozPerspective" in div.style) s3d=true;
            if("OPerspective" in div.style) s3d=true;
            if("MsPerspective" in div.style) s3d=true;
            if("perspective" in div.style) s3d=true;

             //Test with Media query for Webkit to prevent FALSE positive
            if(s3d && ("webkitPerspective" in div.style) ) {

                var st = document.createElement('style');
             st.textContent = '@media (-webkit-transform-3d), (transform-3d), (-moz-transform-3d), (-o-transform-3d), (-ms-transform-3d) {#test3d{height:5px}}'
                document.getElementsByTagName('head')[0].appendChild(st);
                /*document.body.appendChild(div);

               s3d = div.offsetHeight === 5;;
                st.parentNode.removeChild(st);
                div.parentNode.removeChild(div);*/
            }
            return s3d;
        })(),

        // Save a reference to some core methods
        to_s = function (anything) { return Object.prototype.toString.call(anything); },
        toString = Object.prototype.toString,
        core_toString = Object.prototype.toString,
        hasOwn = Object.prototype.hasOwnProperty,
        slice = Array.prototype.slice,
        trim = String.prototype.trim,
        _decode = function( str ) { return decodeURIComponent((str || '').replace(/\+/g, ' ')); },
        _encode = encodeURIComponent,
        _escapeHTML = function(s) {
            return String(s).replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        },
        class2type={ "[object Boolean]": 'boolean', "[object Number]": 'number', "[object String]": 'string', "[object Function]": 'function', "[object Array]": 'array', "[object Date]": 'date', "[object RegExp]": 'regexp', "[object Object]": 'object'},


    //Helper methods
        eventHandlers = [],
        previousHashValue = window.location.hash,
        attachEvent = function (element, evtName, handler) {
            if (element.addEventListener) {
                element.addEventListener(evtName, handler, false);
            } else if (element.attachEvent) {
                element.attachEvent("on" + evtName, handler);
            } else {
                element["on" + evtName] += handler;
            }
        },
        detachEvent = function (element, evtName, handler) {
            if (element.removeEventListener) {
                element.removeEventListener(evtName, handler, false);
            } else if (element.detachEvent) {
                element.detachEvent("on" + evtName, handler);
            } else {
                element["on" + evtName] -= handler;
            }
        },
        arrayRemove = function (array, from, to) {
            /* function source: http://ejohn.org/blog/javascript-array-remove/ */
            var rest = array.slice((to || from) + 1 || array.length);
            array.length = from < 0 ? array.length + from : from;
            return array.push.apply(array, rest);
        },
        //todo hashToObject
        hashToObject = function (hash) {
            /* create a "dictionary" object for the passed in hash value */
            var obj = {}, pair = null, strHash = hash.substring(0, hash.length), hasQuery = true;
            if (strHash.indexOf("#") === 0) {
                strHash = strHash.substring(1, strHash.length);
            }
            var queryIndex = strHash.indexOf("?");
            if (queryIndex > -1) {
                strHash = strHash.substring(queryIndex + 1, strHash.length);
            }else{
                hasQuery = false;
            }
            if(hasQuery){
                var parts = strHash.split("&");
                for (var i in parts) {
                    pair = parts[i].split("=");
                    obj[_decode(pair[0]).toString().toLowerCase()] = _decode(pair[1]);
                }
            }
            return obj;
        },
        //todo objectToHash
        objectToHash = function (object) {
            var s = "";
            for (var i in object) {
                if (object[i] !== undefined && i !== '') {
                    if (s.length > 0) {
                        s += "&";
                    }
                    if(typeof object[i] == "object"){
                        s += i.toString() + "=[" + objectToHash(object[i])+']';
                    }else{
                        s += i.toString() + "=" + object[i].toString();
                    }

                }
            }
            return s;
        },
        parseHashRoot = function (hash) {
            var strHash = hash.substring(0, hash.length);
            if (strHash.indexOf("#") > -1) {
                strHash = strHash.substring(1, strHash.length);
            }
            if (strHash.indexOf("?") > -1) {
                strHash = strHash.substring(0, strHash.indexOf("?"));
            }
            return strHash;
        },

        ROUTE_REPLACE = "([^\/]+)",
        ROUTE_MATCH = /{([\w\d]+)}/g,
        getRouteMatches = function (route, root) {
            var pathRegex = new RegExp(route.replace(ROUTE_MATCH, ROUTE_REPLACE) + "$")
            return root.match(pathRegex);
        },
        routeHandler = function () {
            var root = appCore.root();
            var defaultRoute = appCore.defaultRoute();
            if ((root || '').length === 0 && defaultRoute) {
                appCore.setHash(defaultRoute.root, defaultRoute.query);
                return;
            }
            for (var r in appCore._routes) {
                if (typeof (r) === "string") {
                    var matches = getRouteMatches(r, root);
                    if (matches !== null) {
                        var handler = appCore._routes[r];
                        var context = {};
                        var routeParts = r.match(ROUTE_MATCH);
                        if (routeParts !== null) {
                            for (var rp = 0; rp < routeParts.length; rp++) {
                                var routePartName = routeParts[rp].substring(1).substring(0, routeParts[rp].length - 2);
                                context[routePartName] = _decode(matches[rp + 1]);
                            }
                        }

                        handler.call(context);

                        return;
                    }

                }
            }
        },
        SHA1 = function(msg) {

        	function rotate_left(n,s) {
        		var t4 = ( n<<s ) | (n>>>(32-s));
        		return t4;
        	};

        	function lsb_hex(val) {
        		var str="";
        		var i;
        		var vh;
        		var vl;

        		for( i=0; i<=6; i+=2 ) {
        			vh = (val>>>(i*4+4))&0x0f;
        			vl = (val>>>(i*4))&0x0f;
        			str += vh.toString(16) + vl.toString(16);
        		}
        		return str;
        	};

        	function cvt_hex(val) {
        		var str="";
        		var i;
        		var v;

        		for( i=7; i>=0; i-- ) {
        			v = (val>>>(i*4))&0x0f;
        			str += v.toString(16);
        		}
        		return str;
        	};


        	function Utf8Encode(string) {
        		string = string.replace(/\r\n/g,"\n");
        		var utftext = "";

        		for (var n = 0; n < string.length; n++) {

        			var c = string.charCodeAt(n);

        			if (c < 128) {
        				utftext += String.fromCharCode(c);
        			}
        			else if((c > 127) && (c < 2048)) {
        				utftext += String.fromCharCode((c >> 6) | 192);
        				utftext += String.fromCharCode((c & 63) | 128);
        			}
        			else {
        				utftext += String.fromCharCode((c >> 12) | 224);
        				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        				utftext += String.fromCharCode((c & 63) | 128);
        			}

        		}

        		return utftext;
        	};

        	var blockstart;
        	var i, j;
        	var W = new Array(80);
        	var H0 = 0x67452301;
        	var H1 = 0xEFCDAB89;
        	var H2 = 0x98BADCFE;
        	var H3 = 0x10325476;
        	var H4 = 0xC3D2E1F0;
        	var A, B, C, D, E;
        	var temp;

        	msg = Utf8Encode(msg);

        	var msg_len = msg.length;

        	var word_array = new Array();
        	for( i=0; i<msg_len-3; i+=4 ) {
        		j = msg.charCodeAt(i)<<24 | msg.charCodeAt(i+1)<<16 |
        		msg.charCodeAt(i+2)<<8 | msg.charCodeAt(i+3);
        		word_array.push( j );
        	}

        	switch( msg_len % 4 ) {
        		case 0:
        			i = 0x080000000;
        		break;
        		case 1:
        			i = msg.charCodeAt(msg_len-1)<<24 | 0x0800000;
        		break;

        		case 2:
        			i = msg.charCodeAt(msg_len-2)<<24 | msg.charCodeAt(msg_len-1)<<16 | 0x08000;
        		break;

        		case 3:
        			i = msg.charCodeAt(msg_len-3)<<24 | msg.charCodeAt(msg_len-2)<<16 | msg.charCodeAt(msg_len-1)<<8	| 0x80;
        		break;
        	}

        	word_array.push( i );

        	while( (word_array.length % 16) != 14 ) word_array.push( 0 );

        	word_array.push( msg_len>>>29 );
        	word_array.push( (msg_len<<3)&0x0ffffffff );


        	for ( blockstart=0; blockstart<word_array.length; blockstart+=16 ) {

        		for( i=0; i<16; i++ ) W[i] = word_array[blockstart+i];
        		for( i=16; i<=79; i++ ) W[i] = rotate_left(W[i-3] ^ W[i-8] ^ W[i-14] ^ W[i-16], 1);

        		A = H0;
        		B = H1;
        		C = H2;
        		D = H3;
        		E = H4;

        		for( i= 0; i<=19; i++ ) {
        			temp = (rotate_left(A,5) + ((B&C) | (~B&D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
        			E = D;
        			D = C;
        			C = rotate_left(B,30);
        			B = A;
        			A = temp;
        		}

        		for( i=20; i<=39; i++ ) {
        			temp = (rotate_left(A,5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
        			E = D;
        			D = C;
        			C = rotate_left(B,30);
        			B = A;
        			A = temp;
        		}

        		for( i=40; i<=59; i++ ) {
        			temp = (rotate_left(A,5) + ((B&C) | (B&D) | (C&D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
        			E = D;
        			D = C;
        			C = rotate_left(B,30);
        			B = A;
        			A = temp;
        		}

        		for( i=60; i<=79; i++ ) {
        			temp = (rotate_left(A,5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
        			E = D;
        			D = C;
        			C = rotate_left(B,30);
        			B = A;
        			A = temp;
        		}

        		H0 = (H0 + A) & 0x0ffffffff;
        		H1 = (H1 + B) & 0x0ffffffff;
        		H2 = (H2 + C) & 0x0ffffffff;
        		H3 = (H3 + D) & 0x0ffffffff;
        		H4 = (H4 + E) & 0x0ffffffff;

        	}

        	var temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);

        	return temp.toLowerCase();

        },
        Api =  {
        create : function (app_core, module_name) {

            var Core = function(){

                if(selectorEngine !== undefined){
                    return selectorEngine.apply(this, arguments);
                }else{
                    var selector ="";
                    if(arguments.length > 0 && arguments[0]!== undefined){
                        selector = arguments[0]
                        try {
                            var results = document.querySelectorAll(selector);
                        } catch(e) {
                            var results = null;
                            app_core.log(selector.slice(e.position));
                        }
                    }

                    return results;
                }
            };
            var domObject = Core('#' + module_name);
            domObject = (domObject !== null)? domObject: undefined;
            var objects = {

                            /**Public High-level Method to broadcast the message to all subscribers. Method takes one parameter,
                             ** which can be either a string representation of event or an object with some configuration parameters.
                             ** Configuration parameters are:
                             ** {topic: string, system: bool, module: bool}
                             **
                             ** {topic}: is a string representation of event.
                             **
                             ** {system}: defines whether system events should be included into broadcast. This is handy parameter
                             ** for inter-module event pub/sub communication. Default is true.
                             **
                             ** {module}: defines whether or not module events should be included into broadcast. If set to false, can be used
                             ** for system events of the core Application. This is really handy option for creating/extending the main application
                             ** with internal system modules/events. All inner working of the framework use module = false for internal communication.
                             **
                             ** publish() has no limitations to the number of parameters sent to the subscriber's eventHandler function.
                             **
                             ** Example with parameters:
                             **
                             **publish( topic: string, arg 1, arg2, arg3, ...)
                             **publish( {topic: string, system: bool, module: bool}, arg 1, arg2, arg3, ...)**/
                            publish: function() {
                                this.getCore().sendMessage.apply(this.getCore(), arguments);

                            },
                            /**API High-level Method to subscribe to the event. Topic and eventHandler are two required parameters,
                             ** options object is optional and consist of:
                             **
                             ** {context: null, priority: int, system: bool}
                             **
                             ** {context}: The value of "this" when the event handler is called. Often there is a need to operate within a context for a subscription callback. It can be a reasonable strategy to have the context be set to a jQuery object that will be used inside of the subscription, or even a native DOM element. Default is module instance.
                             ** {priority}: Priority relative to other subscriptions for the same message. Lower values have higher priority. Subscribing to a topic with high priority can be useful as an error handler or anytime data may need to be checked or augmented before proceeding. Default is 10.
                             ** {system}: Defines if it is system event or not. All internal events of the framework have system event set to true. All module events have system set to false. It' is useful for separation of module and system eventing and is done to prevent unsubscribe() method used trough module API from unsubscribing essential system events from global event stack. By the same time, if system module is created this must be set to true. Only system module can unsubscribe system events. Default is false.
                             ** {data}: This parameter sends additional key-value object to the event. This can be used as a static unmodifiable configuration data structure. An example for usa case would be when event is created inside of the module, module creates static field '_module_' : module name', which is used for module look up, when only id of the subscription is known.
                             **
                             ** subscribe() can pass none, single or multiple parameters to eventHandler.
                             **
                             **Returning false from the event handler will prevent any additional subscriptions from being invoked and will cause publish() to return false.
                             ** Example with parameters:
                             **
                             **subscribe( topic: string, eventHandler: function())
                             **subscribe( topic: string, eventHandler: function(param))
                             **subscribe( topic: string, eventHandler: function(param1, param2, ...))
                             **subscribe( topic: string, eventHandler: function(param1, param2, ...), options: {context: this, priority: 10, system: false, data: object{key:value} })
                             **
                             **Returns {topic: string, uid: string, system: bool} or false
                             **/
                            subscribe: function() {
                                var arg = {module: this.getName(), context: this.getCore(), args: arguments};
                                return this.getCore().receiveMessage(arg);
                            },
                            /**Public High-level Method to unsubscribe from the event. Topic and uid are two required parameters.
                             ** Third parameter "system" is optional and used to remove system events. Default is false.
                             **
                             **
                             ** Example with parameters:
                             **
                             **unsubscribe( ) - removes all events from module. Useful when destroying module.
                             **unsubscribe( module: string) - removes all events from module. Useful when destroying module.
                             **unsubscribe( topic: string) - module will be assigned automatically, based on the module called from
                             **unsubscribe( module: string, topic: string) - removes specific event from specific module.
                             **unsubscribe( {topic: string, uid: string, system: bool}) - takes an event object returned from subscribe() function.
                             **unsubscribe( {topic: string, uid: string} ) - takes an event object returned from subscribe() function with less parameters.
                             **
                             **takes an array of event objects from subscribe() function.
                             **unsubscribe( Array: [
                             **    {topic: string, uid: string, system: bool},
                             **    {topic: string, uid: string, system: bool},
                             **    {topic: string, uid: string, system: bool}
                             ** ] )
                             ** or
                             **unsubscribe( Array: [
                             **    {topic: string, uid: string},
                             **    {topic: string, uid: string},
                             **    {topic: string, uid: string}
                             ** ] )
                             **
                             **takes an array of module strings.
                             **unsubscribe( Array: [
                             **    module: string,
                             **    module: string,
                             **    module: string
                             ** ] )
                             **
                             **takes an array of topic strings.
                             **unsubscribe( Array: [
                             **    topic: string,
                             **    topic: string,
                             **    topic: string
                             ** ] )
                             **/
                            unsubscribe: function() {
                                var args = {module: this.getName(), args: arguments};
                                return this.getCore().destroyMessage(args);
                            },
                            /**
                             @description Shorthand method to check if element is in array
                             @example $.inArray(elem, array)
                             @return bool
                             */
                            inArray: function() {
                                this.getCore().inArray.apply(this, arguments);
                            },
                            /**
                             @description Get the global static AppCore config
                             @return string
                             */
                            config : config,
                            /**
                             @description Shorthand method to subscribe to hashchange event
                             @param eventHandler
                             @return void
                             */
                            hashchange: function(handler){
                                this.subscribe('url-change', handler);
                            }
                }
            /**
            @description Get the name of the defined module
            @param none
            @return string
            */
            objects['getName'] = function () {
                return module_name;
            }
            /**
            @description Get the name of the defined selector engine
            @param none
            @return string
            */
            objects['getEngineName'] = function () {
                return selectorEngineName;
            }
            /**
            @description Get the reference to the AppCore
            @param none
            @return object
            */
            objects['getCore'] = function () {
                return app_core;
            }
            /**
             @description Get the reference to the Dom Collection of the module. Must be set prior with setContainer. When module is created Core searches module name amongths Dom elements.
             @param none
             @return dom object
             */
            objects['getContainer'] = function () {
                return domObject;
            }
            /**
             @description Bind Dom elements to the module. Creates Dom association with the module.
             @param none
             @return dom object
             */
            objects['setContainer'] = function (new_Container) {
                domObject = Core(new_Container);
            }
            /**
             @description Logs the message from the module. Module name is automatically appended.
             @see Due to diffident implementations of console in Firefox and Webkit browsers, line numbers
             getting messed up in Webkits, but correct in Firefox. Webkits use __proto__ for all methods,
             this is the reason why they cannot be reassigned to Api variables and should be used via apply.
             @param message string;
             @return void
             */
            for(var i = 0, length = _console.length; i < length; i++){
                objects[_console[i]] = app_core[_console[i]];
            }

            extend(true, objects, extensions);
            extend(true, Core, objects);
            return Core
        }

    };

    /**
     @description Internal helper method to extend objects and arrays. Return the modified object.
     @param boolean deep copy? Default false
     @param object/array object which will be extended
     @param object/array object which will extend
     @return object
     */
    function extend(){

        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;

        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !appCore.isFunction(target) ) {
            target = {};
        }

        for ( ; i < length; i++ ) {
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) != null ) {
                // Extend the base object
                for ( name in options ) {
                    src = target[ name ];
                    copy = options[ name ];
                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if ( deep && copy && ( appCore.isPlainObject(copy) || (copyIsArray = appCore.isArray(copy)) ) ) {
                        if ( copyIsArray ) {
                            copyIsArray = false;
                            clone = src && appCore.isArray(src) ? src : [];

                        } else {
                            clone = src && appCore.isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[ name ] = extend( deep, clone, copy );

                        // Don't bring in undefined values
                    } else if ( copy !== undefined ) {
                        target[ name ] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    };
    /**
     @description Internal helper method to parse events and set correct event namespace for local type events. Local type events are 'module:event'. They use semicolon. Return either the modified eventId or original evenId if considered non-local event.
     @param string module
     @param string event
     @return string
     */
    function parseEvent(module, event){
        if(event.charAt(0) ==':'){
            event = module+event;
        }
        return event;
    };

    appCore = {

        /**
         @description Enable/Disable debug mode.
         @param on boolean. Default false
         @return void
         */
        debug : function (on) {
            debug  = on ? true : false;
        },

        /**
         @description Set selector engine in the AppCore. jQuery, Zepto or any other selector engines can be used. Simply pass the reference to the desired Selector engine and it becomes available in All modules through api. If jQuery is present on the page it is automatically selected as default selector Engine. Only one selector engine can be specified / active at the time.
         @param engine object. Default jQuery.
         @example AppCore.setSelectorEngine('jquery', jQuery);
         @return void
         */
        setSelectorEngine : function (name, engine) {
            selectorEngine = engine;
            selectorEngineName = name;
        },

        /**
         @description Extends Facade Api available in the module. This method should be used to add new methods and properties to the Api. Api is passed to the module as a first argument e.g AppCore.module("module_name", function(Api) {}). Default Api consist of small but essential set of features, just enough to get started on the new big thing. Due to the fact that each and every project is individual, this Api should be adjusted and extended on per project bases. Api itself is created in modular way and can be copied across to the new project.
         @param Api cobject that should be added to the api.
         @param dependency string. Optional. Used in conjunction with selector engine. If api methods depend on specific selector engine, dependency should be specified to the name of that engine. It helps to protect the code from possible errors. Errors occur when new methods of the api try to access some functionality of non-specified / non-registered selector engine. If dependency is specified it will check if it's active and only then extend the Api. If dependency does not match the selector engine, the Api will not be extended with the newly declared methods.
         @example 1. set selector engine: AppCore.setSelectorEngine('jquery', jQuery). Note: jQuery is default selector engine. If jQuery is included in the page, it will be set as default selector engine automatically and this step can be skipped.
                  2. AppCore.extendApi({
                          find : function (selector) {
                              return this.getContainer().find(selector);
                          }
                      }, 'jquery')
         @return void
         */
        extendApi : function (new_object, dependency) {
            if(dependency !== undefined){
                if(dependency == selectorEngineName){
                    extend(true, extensions, new_object);
                }
            }else{
                extend(true, extensions, new_object);
            }

        },

        /**
         @description Extends AppCore . This method should be used to add new methods and properties to the AppCore.
         @param Api cobject that should be added to the core AppCore.
         @example @see extendApi
         @return void
         */
        extend : function (new_object) {
            extend(true, appCore, new_object);
        },

        /**
         @description App config object. This is shared object available between all modules and events in the app. Even though config can be extended at any time, this is strongly discouraged. Best practices dictate that commonly shared object must be declared constant and any data interaction/modification should be and can be achieved through event message passing. This avoids any possible race conditions and stuff that is generally hard to debug. This method creates static, non-mutable object, which is declared right after AppCore autostart but before creation of any AppCore.module(s).
         @param new_config js Object. Default false
         @return AppCore.config() - gets config.
                 AppCore.config({speed: 800}) - returns new config after extention.
         */
        config : function (new_config) {
            if(new_config === undefined){
                return config;
            }else{
                return extend(true, config, new_config);
            }
        },

        /**
         @description Register AppCore page. To start the page @see startPage(page_name);
         @param pageID string. Name of the page. Used to start or stop the page.
         @param creator function. Page executable.
         @return void
         */
        page : function (pageID, creator) {
            var temp;
            if (typeof pageID === 'string' && typeof creator === 'function') {
                temp = creator(Api.create(this, pageID));
                if (temp.init && typeof temp.init === 'function' && temp.destroy && typeof temp.destroy === 'function') {
                    temp = null;
                    moduleData[pageID] = {
                        create : creator,
                        instance : null,
                        registeredStates: ['init'],
                        currentState: null
                    };
                } else {
                    this.log(1, "Page '" + pageID + "' Registration : FAILED : instance has no init or destory functions");
                }
            } else {
                this.log(1, "Page '" + pageID + "' Registration : FAILED : one or more arguments are of incorrect type");
            }
        },

        /**
         @description Register AppCore module. To start the page @see startModule(module_name);
         @param moduleID string. Name of the Module. Used to start or stop the module.
         @param creator function. Module executable.
         @return void
         */
        module : function (moduleID, creator) {
            var temp;
            if (typeof moduleID === 'string' && typeof creator === 'function') {
                temp = creator(Api.create(this, moduleID));
                if (temp.init && typeof temp.init === 'function' && temp.destroy && typeof temp.destroy === 'function') {
                    temp = null;
                    moduleData[moduleID] = {
                        create : creator,
                        instance : null
                    };
                } else {
                    this.log(1, "Module '" + moduleID + "' Registration : FAILED : instance has no init or destory functions");
                }
            } else {
                this.log(1, "Module '" + moduleID + "' Registration : FAILED : one or more arguments are of incorrect type");
            }
        },
        //todo check current methods
        progressOpen: function(pageID){
            if(moduleData[pageID] !== undefined && moduleData[pageID].currentState !== undefined && moduleData[pageID].instance !== null){
                if(moduleData[pageID].currentState === 1){
                    moduleData[pageID].currentState++;
                    this.publish(pageID+':'+moduleData[pageID].registeredStates[moduleData[pageID].currentState]);
                }
            }
        },
        progressClose: function(pageID){
            if(moduleData[pageID] !== undefined && moduleData[pageID].currentState !== undefined && moduleData[pageID].instance !== null){
                moduleData[pageID].currentState = 4;
                this.publish(pageID+':'+moduleData[pageID].registeredStates[moduleData[pageID].currentState]);
            }
        },
        /**
         @description Check to see if module/page is currently running.
         @param pageID/moduleID string. Name of the page/module.
         @return void
         */
        isRunning: function(name){
            var _isRunning = false;
            if(moduleData[name] !== undefined && moduleData[name].instance !== null){
                _isRunning = true;
            }
            return _isRunning;
        },
        /**
         @description Shorthand method to close particular page. Same as AppCore.publish(pageID+':close');
         @param pageID string. Name of the page.
         @return void
         */
        close: function(pageID){
            if(moduleData[pageID] !== undefined && moduleData[pageID].instance !== null){
                this.publish(pageID+':close');
            }
        },
        /**
         @description Start registered AppCore page.
         @param pageID string. Name of the page. Used to start or stop the page.
         @return void
         */
        startPage : function (pageID, data) {

            var _this = this,
            _pages = [],
            _instances = [],
            _runningInstances = [],
            intersectionIndex = 0,
            pagesIndex = [];

            if(pages.length !== 0){
                for(var _pages_i= 0, _pages_length = _pages.length; _pages_i < _pages_length; _pages_i++){
                    if(pages[_pages_i] !== undefined && _pages[_pages_i] === pages[_pages_i]){
                        intersectionIndex = _pages_i;
                        _runningInstances.push(_pages[_pages_i]);
                    }else{
                        intersectionIndex = _pages_i;
                        break;
                    }
                }
            }
            pageID = _pages;
            if(pages.length !== 0){

                if(intersectionIndex < pages.length){
                    for (var _i_close = (pages.length-1); _i_close >= intersectionIndex; _i_close--){
                        if((_i_close-1) < intersectionIndex){

                            var unloaded_final = AppCore.subscribe(pages[_i_close]+':unloaded', function(){

                                AppCore.unsubscribe([unloaded_final]);
                                startPages();
                            });
                            pagesIndex.push(_i_close);
                        }else{
                            var next = pages[_i_close-1],
                                current = pages[_i_close],
                                event = AppCore.subscribe(current+':unloaded', function(){
                                    AppCore.unsubscribe([this.event]);
                                    AppCore.publish(this._next+':close');
                                });
                            for(var search_i = 0, search_length = subscriptions[current+':unloaded'].length; search_i < search_length; search_i++){
                                if(subscriptions[current+':unloaded'][search_i].uid === event.uid){
                                    subscriptions[current+':unloaded'][search_i].context = {_next: next, _current: current, event: event}
                                    break;
                                }
                            }
                            pagesIndex.push(_i_close);
                        }

                    }
                    AppCore.publish(pages[(pages.length-1)]+':close');
                }else{
                    startPages();
                }
            }else{
                startPages();
            }
            function startPages(){
                for (var _i = intersectionIndex, _length = pageID.length; _i < _length; _i++){
                    var mod = moduleData[pageID[_i]],
                        pageName = pageID[_i];
                    if (mod) {
                        var api = Api.create(_this, pageID[_i]);

                        api['data'] = data;
                        mod.instance = mod.create(api);
                        mod.instance['__getName'] = pageID[_i];
                        moduleData[pageID[_i]].currentState = 0;
                        mod.instance.init();

                        _instances.push(pageID[_i]);

                        if(typeof mod.instance['pageLoad'] !== 'function'){
                            mod.instance['pageLoad'] = function(){
                                AppCore.progressOpen(pageID[_i])
                            }
                        }

                        api.subscribe(':pageLoad', mod.instance['pageLoad']);

                        if(typeof mod.instance['pageReady'] !== 'function'){
                            mod.instance['pageReady'] = function(){}
                        }

                        api.subscribe(':pageReady', mod.instance['pageReady']);

                        if(typeof mod.instance['beforeDestroy'] !== 'function'){
                            mod.instance['beforeDestroy'] = function(){}
                        }

                        api.subscribe(':beforeDestroy', mod.instance['beforeDestroy']);


                        api.subscribe(':pageDestroy', function(){
                            var pageName = api.getName();
                            moduleData[pageName].currentState = null;
                            AppCore.stopPage(mod.instance['__getName']);
                            AppCore.publish(pageName+':unloaded');
                        });
                        api.subscribe(':close', function(){
                            moduleData[pageID].currentState = 3;
                            api.publish(api.getName()+':beforeDestroy');
                        });
                        if(mod.registeredStates.length <= 1){
                            mod.registeredStates.push('pageLoad');
                            mod.registeredStates.push('pageReady');
                            mod.registeredStates.push('beforeDestroy');
                            mod.registeredStates.push('pageDestroy');
                        }

                        moduleData[pageID[_i]].currentState = 1;
                        AppCore.publish(pageID[_i]+':pageLoad');
                    }
                }
                for(var _i_index_p = 0, length_index_p = pagesIndex.length; _i_index_p < length_index_p; _i_index_p++){
                    pages.splice(pagesIndex[_i_index_p], 1);
                };
                pages = pages.concat(_instances);
            }
        },
        /**
         @description Start registered AppCore module.
         @param moduleID string. Name of the module. Used to start or stop the module.
         @param content any. Passes some data to the module. It can be anything.
         @return void
         */
        startModule : function (moduleID, data) {
            var _this = this;
            if(!this.isArray(moduleID)){
                moduleID = [moduleID];
            }
            for (var _i = 0, _length = moduleID.length; _i < _length; _i++){
                var mod = moduleData[moduleID[_i]];
                if (mod) {
                    var api = Api.create(_this, moduleID[_i]);
                    api['data'] = data;
                    mod.instance = mod.create(api);
                    mod.instance['__getName'] = moduleID[_i];
                    mod.instance.init();
                }
            }

        },

        /**
         @description Start all registered AppCore module.
         @return void
         */
        startAllModules : function () {
            var moduleID;
            for (moduleID in moduleData) {
                if (moduleData.hasOwnProperty(moduleID)) {
                    this.startModule(moduleID);
                }
            }
        },

        /**
         @description Stop running AppCore module.
         @param moduleID string. Name of the module. Used to start or stop the module.
         @return void
         */
        stopModule : function (moduleID) {
            var mod = moduleData[moduleID];
            if (mod !==undefined && mod.instance !== undefined) {
                if(mod.instance !== null){
                    mod.instance.destroy();
                    mod.instance = null;
                }
            } else {
                this.log(1, "Stop Module '" + moduleID + "': FAILED : module does not exist or has not been started");
            }
        },

        /**
         @description Stop running AppCore page.
         @param pageID string. Name of the page. Used to start or stop the page.
         @return void
         */
        stopPage : function (pageID) {
            var mod = moduleData[pageID];
            if (mod !==undefined && mod.instance !== undefined) {
                if(mod.instance !== null){
                    mod.instance.destroy();
                    mod.instance = null;
                }
            } else {
                this.log(1, "Stop Page '" + pageID + "': FAILED : page does not exist or has not been started");
            }
        },

        /**
         @description Stops all running AppCore modules.
         @return void
         */
        stopAllModules : function () {
            var moduleID;
            for (moduleID in moduleData) {
                if (moduleData.hasOwnProperty(moduleID)) {
                    this.stopModule(moduleID);
                }
            }
        },

        /**Public Low-level Method to broadcast the message to all subscribers. Method takes one parameter,
         ** which can be either a string representation of event or an object with some configuration parameters.
         ** Configuration parameters are:
         ** {topic: string, system: bool, module: bool}
         **
         ** {topic}: is a string representation of event.
         **
         ** {system}: defines whether system events should be included into broadcast. This is handy parameter
         ** for inter-module event pub/sub communication. Default is true.
         **
         ** {module}: defines whether or not module events should be included into broadcast. If set to false, can be used
         ** for system events of the core Application. This is really handy option for creating/extending the main application
         ** with internal system modules/events. All inner working of the framework use module = false for internal communication.
         **
         ** publish() has no limitations to the number of parameters sent to the subscriber's eventHandler function.
         **
         ** Example with parameters:
         **
         **publish( topic: string, arg 1, arg2, arg3, ...)
         **publish( {topic: string, system: bool, module: bool}, arg 1, arg2, arg3, ...)**/
        publish: function( topic ) {
            var args = slice.call( arguments, 1 ),
                topicSubscriptions,
                subscription,
                system = true,
                module = true,
                length,
                i = 0,
                ret;
            if(typeof topic === "object" ){
                system = topic.system;
                module = topic.module;
                topic = topic.topic;
            }
            if ( typeof topic !== "string" ) {
                this.log(1, "You must provide a valid topic to publish." );
            }
            if ( !subscriptions[ topic ] ) {
                return true;
            }

            topicSubscriptions = subscriptions[ topic ].slice();
            for ( length = topicSubscriptions.length; i < length; i++ ) {
                subscription = topicSubscriptions[ i ];
                if(system === true && module === true){
                    ret = subscription.callback.apply( subscription.context, args );
                }
                else if(system === false && module === true){
                   if(subscription.system === false){
                       ret = subscription.callback.apply( subscription.context, args );
                   }
                }else if(system === true && module === false){
                   if(subscription.system === true){
                       ret = subscription.callback.apply( subscription.context, args );
                   }
                }
                if ( ret === false ) {
                    break;
                }

            }
            return ret !== false;
        },

        /**Public Low-level Method to subscribe to the event. Topic and eventHandler are two required parameters,
        ** options object is optional and consist of:
        **
        ** {context: null, priority: 10, system: true}
        **
        ** {context}: The value of "this" when the event handler is called. Often there is a need to operate within a context for a subscription callback. It can be a reasonable strategy to have the context be set to a jQuery object that will be used inside of the subscription, or even a native DOM element.
        ** {priority}: Priority relative to other subscriptions for the same message. Lower values have higher priority. Default is 10. Subscribing to a topic with high priority can be useful as an error handler or anytime data may need to be checked or augmented before proceeding.
        ** {system}: Defines if it is system event or not. All internal events of the framework have system event set to true. All module events have system set to false. It' is useful for separation of module and system eventing and is done to prevent unsubscribe() method used trough module API from unsubscribing essential system events from global event stack. By the same time, if system module is created this must be set to true. Only system module can unsubscribe system events. Default is true.
        **
        ** {data}: This parameter sends additional key-value object to the event. This can be used as a static unmodifiable configuration data structure. An example for use case would be when event is created inside of the module, module creates static field '_module_' : module name', which is used for module look up, when only id of the subscription is known.
         ** subscribe() can pass none, single or multiple parameters to event handler.
        **
        **Returning false from the event handler will prevent any additional subscriptions from being invoked and will cause publish() to return false.
        ** Example with parameters:
        **
        **subscribe( topic: string, eventHandler: function())
        **subscribe( topic: string, eventHandler: function(param))
        **subscribe( topic: string, eventHandler: function(param1, param2, ...))
        **subscribe( topic: string, eventHandler: function(param1, param2, ...), options: {context: null, priority: 10, system: true, data: object{key: value} } )
        **
        **Returns {topic: string, uid: string, system: bool}
        **/
        subscribe: function( topic, eventHandler, options) {
            var context = null,
                priority = 10,
                system = true,
                data = false;
            if(options){
                context = (options.context!== undefined) ? options.context: context;
                priority = (options.priority!== undefined) ? options.priority: priority;
                system = (options.system!== undefined) ? options.system: system;
                data = (options.data!== undefined) ? options.data: data;
            }
            if(debug){
                if ( this.typeOf(topic) !== "string" ) {
                    this.log(1, "You must provide a valid topic to subscribe." );
                }
                if ( this.typeOf(eventHandler) !== "function" ) {
                    this.log(1, "You must provide a event handler to subscribe." );
                }
            }

            var added = false,
                unique = this.unique(),
                d = new Date();
                d = d.getTime();
            var _uid = d+'_'+unique;
            if ( !subscriptions[ topic ] ) {
                subscriptions[ topic ] = [];
            }

            var subscriptionInfo = {
                    uid: _uid,
                    callback: eventHandler,
                    context: context,
                    priority: priority,
                    system: system
                };
            if(data != false){
                subscriptionInfo.data = data;
            }
            var i = subscriptions[ topic ].length - 1;
            for ( ; i >= 0; i-- ) {
                if ( subscriptions[ topic ][ i ].priority <= priority ) {
                    subscriptions[ topic ].splice( i + 1, 0, subscriptionInfo );
                    added = true;
                    break;
                }
            }

            if ( !added ) {
                subscriptions[ topic ].unshift( subscriptionInfo );
            }
            var output = {topic: topic, uid: _uid, system: system};
            return output;
        },

        /**Public Low-level Method to unsubscribe from the event. Topic and uid are two required parameters.
         ** Third parameter "system" is optional and used to control the removal of system events. Default is true.
         **
         **
         ** Example with parameters:
         **
         **unsubscribe( topic: string, uid: string)
         **unsubscribe( topic: string, uid: string, system: bool )
         **
         **unsubscribe( Array: [
         **    {topic: string, uid: string, system: bool},
         **    {topic: string, uid: string, system: bool},
         **    {topic: string, uid: string, system: bool}
         ** ] )
         **/
        unsubscribe: function( topic, uid, system ) {
            var removed = true,
                _includeSystem = true;
            if(arguments.length == 3){
                if(debug){
                    if(typeof system == "boolean"){
                        this.log(1, "Unsubscribe: parameter \"includeSystem\" must be boolean value." );
                    }

                }
                _includeSystem = (system == false) ? false : true;
            }
            if(arguments.length >= 2){
                removed = false;
                if ( typeof topic !== "string" && typeof uid !== "string") {
                    this.log(1, "You must provide a valid topic and subscription uid to remove a subscription." );
                    return false;
                }

                if ( !subscriptions[ topic ] ) {
                    this.log(1, "Failed to unsubscribe from: topic " + topic + ', uid '+ uid + ', system ' + system );
                    return false;
                }

                var length = subscriptions[ topic ].length,
                    i = 0;

                for ( ; i < length; i++ ) {
                    if ( (subscriptions[ topic ][ i ].uid === uid) && (subscriptions[ topic ][ i ].system === _includeSystem)) {
                        subscriptions[ topic ].splice( i, 1 );
                        removed = true;
                        break;
                    }
                }
                if(subscriptions[ topic ].length == 0){
                    delete subscriptions[ topic ];
                }
            }else if(arguments.length == 1){
                var topics, tmpRmvd;

                if (this.isArray(topic)) {
                    topics = topic;
                    tmpRmvd = topics.length;
                    for(var arg_i = 0, arg_length = topics.length; arg_i < arg_length; arg_i++){
                        var _topic = topics[arg_i].topic,
                            _uid = topics[arg_i].uid,
                            _system = (topics[arg_i].system === undefined)? true : topics[arg_i].system;
                        if ( !subscriptions[ _topic ] ) {
                            removed = false;
                            continue;
                        }
                        var length = subscriptions[ _topic ].length,
                            i = 0;

                        for ( ; i < length; i++ ) {
                            if ( (subscriptions[ _topic ][ i ].uid === _uid) && (subscriptions[ _topic ][ i ].system === _system) ) {
                                subscriptions[ _topic ].splice( i, 1 );
                                tmpRmvd--;
                                break;
                            }
                        }
                        if(subscriptions[ _topic ].length == 0){
                            delete subscriptions[ _topic ];
                        }
                    }
                    if(tmpRmvd != 0){
                        removed = false;
                        if(debug){
                            this.log(1, "Unsubscribe: not all events were unsubscribed." );
                        }
                    }
                }else{
                    if(debug){
                        this.log(1, "Unsubscribe: argument must be an Array" );
                    }
                }

            }
            return removed;
        },

        //todo remove function below from production
        checkEvents: function(){
//            console.log(eventHandlers)
//            console.log(previousHashValue)
            console.log(pages);
            console.log(subscriptions);
            return console.log(moduleData);
        },
        receiveMessage : function () {
            var module = arguments[0].module,
                topic = arguments[0].args[0],
                args = arguments[0].args,
                subscriber_id;
            topic = parseEvent(module, topic);
            if (moduleData[module] === undefined) {
                if(debug){
                    this.log(1, "receiveMessage: moduleData[module] is undefined for module name " + module);
                }
                return false;
            }
            if(args.length == 3){
                if(args[2].system === undefined){
                    args[2].system = false;
                }
                if(args[2].context === undefined){
                    args[2].context = moduleData[module].instance;
                }
                if(args[2].data === undefined){
                    args[2].data = {'_module_':module};
                }else{
                    args[2].data['_module_'] = module;
                }
            }
            if(args.length == 2){
                var tmp = new Array();
                tmp.push(topic)
                tmp.push(args[1])
                tmp.push({system: false, context: moduleData[module].instance, priority: undefined, data:{'_module_':module} });
                args = tmp;
            }

            subscriber_id = this.subscribe(topic, args[1], args[2]);
            if(moduleData[module].events){
                moduleData[module].events[topic] = subscriber_id;
            }else{
                moduleData[module].events = {};
                moduleData[module].events[topic] = subscriber_id;
            }

            return subscriber_id;
        },
        sendMessage : function () {
            this.publish.apply(this, arguments);

        },
        destroyMessage : function () {
            var module = arguments[0].module,
                args = arguments[0].args
            if(args.length == 0){
                _removeModuleEvents(module, this);

            }else if(args.length == 1){
                var _argument = args[0];

                /*unsubscribe( Array: [{topic: string, uid: string, system: bool}])*/
                /*unsubscribe( Array: [{topic: string, uid: string}])*/
                /*unsubscribe( Array: [topic: string, topic: string])*/
                /*unsubscribe( Array: [module: string, module: string])*/
                if(!this.isArray(_argument)){
                    _argument = args;
                }

                if(_argument.length > 0){

                    for(var i = 0, arg_length = _argument.length; i < arg_length; i++){
                        var argument = _argument[i];

                        if(typeof argument == "string"){
                            argument = parseEvent(module, argument);
                            /*unsubscribe( module: string)*/
                            if( _type(argument, "module")){
                                _removeModuleEvents(argument, this);
                            }else{
                                /*unsubscribe( topic: string)*/
                                if( _type(argument, "event") ){
                                    this.unsubscribe([moduleData[module].events[argument]]);
                                    delete moduleData[module].events[argument];
                                }
                            }
                        }else{

                            /*unsubscribe( {topic: string, uid: string, system: bool})*/
                            if(argument.topic!==undefined && argument.uid!==undefined){

                                var _module =  false;
                                for(var j = 0, length = subscriptions[argument.topic].length; j<length; j++){
                                    if(subscriptions[argument.topic][j].uid == argument.uid){
                                        _module = subscriptions[argument.topic][0].data['_module_'];
                                        break;
                                    }
                                }
                                /*unsubscribe( {topic: string, uid: string})*/
                                if(argument.system===undefined){
                                    argument.system = false;
                                }
                                if(_module != false){
                                    delete moduleData[_module].events[argument.topic];
                                }
                                this.unsubscribe([argument]);
                            }
                        }
                    }
                }
            /*unsubscribe( module: string, topic: string)*/
            }else if(args.length == 2){
                var event = parseEvent(args[0], args[1]);
                this.unsubscribe([moduleData[args[0]].events[event]]);
                delete moduleData[args[0]].events[event];

            }
            //Internal helper method that checks if type is "event" or "module" and returns bool
            //usage _type(string, type);
            //return bool
            function _type(_string, _type){
                if(moduleData[_string] !== undefined){
                    return "module" == _type;
                }
                if(subscriptions[_string] !== undefined){
                    return "event" == _type;
                }
                return false;
            }

            //Internal helper method to remove all events from the given module
            function _removeModuleEvents(_module, _this){
                var mod_name = _module;
                _module = moduleData[_module];
                if(_module !==undefined){
                    var _events = new Array();
                    for( var event in _module.events){
                        _events.push(_module.events[event])
                    }
                    _this.unsubscribe(_events);
                    delete _module['events'];
                }else{
                    if(debug){
                        this.log(1, "destroyMessage: _module " + mod_name + " does not exist in moduleData stack");
                    }
                }
            }
        },
        isArray : Array.isArray || function(array){
            return typeof(array)=='object'&&(array instanceof Array);
        },
        inArray : function( elem, array ) {

            if ( array.indexOf ) {
                return array.indexOf( elem );
            }
            for ( var i = 0, length = array.length; i < length; i++ ) {
                if ( array[ i ] === elem ) {
                    return i;
                }
            }

            return -1;
        },
        // converts function arguments into Array
        toArray : function(_arguments) { return Array.prototype.slice.call(_arguments); },
        // DOM methods and functions like alert
        // aren't supported. They return false on IE.
        isFunction: function( obj ) {
            return this.type(obj) === "function";
        },

        isWindow: function( obj ) {
            return obj != null && obj == obj.window;
        },

        isNumeric: function( obj ) {
            return !isNaN( parseFloat(obj) ) && isFinite( obj );
        },

        type: function( obj ) {
//            console.log(core_toString.call(obj))
            return obj == null ?
                String( obj ) :
                class2type[ core_toString.call(obj) ] || "object";
        },

        isPlainObject: function( obj ) {
            // Must be an Object.
            // Because of IE, we also have to check the presence of the constructor property.
            // Make sure that DOM nodes and window objects don't pass through, as well
            if ( !obj || this.type(obj) !== "object" || obj.nodeType || this.isWindow( obj ) ) {
                return false;
            }

            try {
                // Not own constructor property must be Object
                if ( obj.constructor &&
                    !hasOwn.call(obj, "constructor") &&
                    !hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
                    return false;
                }
            } catch ( e ) {
                // IE8,9 Will throw exceptions on certain host objects
                return false;
            }

            // Own properties are enumerated firstly, so to speed up,
            // if last one is own, then all properties are own.

            var key;
            for ( key in obj ) {}

            return key === undefined || hasOwn.call( obj, key );
        },

        isEmptyObject: function( obj ) {
            for ( var name in obj ) {
                return false;
            }
            return true;
        },
        isTouch: isTouch,
        is3DSupported : is3DSupport,
        removeDuplicates : function(arr) {
            var i,
                len=arr.length,
                out=[],
                obj={};

            for (i=0;i<len;i++) {
                obj[arr[i]]=0;
            }
            for (i in obj) {
                out.push(i);
            }
            return out;
        },
        /**
         @description Polyfill for native String.trim function
         @param attributes_only boolean
         @returns Array
         **/
        trim: trim ?
            function( text ) {
                return text == null ?
                    "" :
                    trim.call( text );
            } :

            // Otherwise use our own trimming functionality
            function( text ) {
                return text == null ?
                    "" :
                    text.toString().replace( trimLeft, "" ).replace( trimRight, "" );
            },
        /** @description Returns an array of keys for the object. If `attributes_only`
            is true will not return keys that map to a `function()`
             @param attributes_only boolean
             @returns Array
         **/
        keys: function(attributes_only) {
            var keys = [];
            for (var property in this) {
                if (!this.isFunction(this[property]) || !attributes_only) {
                    keys.push(property);
                }
            }
            return keys;
        },
        // Checks if the object has a value at `key` and that the value is not empty
        has: function(key) {
            return this[key] && this.trim(this[key].toString()) !== '';
        },
        // convenience method to join as many arguments as you want
        // by the first argument - useful for making paths
        join: function() {
            var args = this.toArray(arguments);
            var delimiter = args.shift();
            return args.join(delimiter);
        },
        unique: function () {
            return  randomizer++;
        },

        random: function (type, length) {
            var _type,
                _length,
                chars;
            var index;
            for (index in arguments)
            {
                if(this.typeOf(arguments[index]) === 'string'){
                    _type = arguments[index];
                }else if (this.typeOf(arguments[index]) === 'number'){
                    length = arguments[index];
                }
            }
            if(_type === undefined){
                _type = 'string';
            }
            if(_length === undefined){
                _length = 8;
            }
            type = _type;
            length = _length;

            switch (type)
            {
                case 'string':
                    chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
                    break;
                case 'int':
                    chars = '0123456789'.split('');
                    break;
                case 'uppercase':
                    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXTZ'.split('');
                    break;
                case 'lowercase':
                    chars = 'abcdefghiklmnopqrstuvwxyz'.split('');
                    break;
                case 'letters':
                    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
                    break;
            }


            if (! length) {
                length = Math.floor(Math.random() * chars.length);
            }

            var str = '';
            for (var i = 0; i < length; i++) {
                str += chars[Math.floor(Math.random() * chars.length)];
            }
            return str;
        },
        typeOf : function (obj) {
            if (obj === undefined) {
                return undefined;
            }
            if (obj === global) {
                return "global";
            }
            if (obj.nodeName && obj.nodeName !== undefined) {
                if(typeof obj.nodeName === 'function' && obj.nodeType === undefined){
                    return 'function';
                }else{
                    if(obj.nodeName.indexOf && obj.nodeName.indexOf('document') != -1){
                        return 'document';
                    }else{
                        return 'dom';
                    }
                }

            }
            return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();

        },
        /** adds an event handler for the "hashchange" event
         * A Hash Change Notification Callback is a function or method that will be called when the "hashchange" event is fired when the "location.hash" value is changed.
         *
         * Example:
         * // add cross-browser "hashchange" event a handler
         * AppCore.hashchange(function() {
         * // called when "hashchange" event is fired
         * // perform some action
         * });
         * */
        hashchange: function (handler) {
            if (hashChangeSupported) {
                attachEvent(window, "hashchange", handler);
            } else {
                eventHandlers.push(handler);
            }
        },

        /** removes an event handler from the "hashchange" event*/
        unbindHashchange: function (handler) {
            var i = 0, len = 0;
            if (hashChangeSupported) {
                detachEvent(window, "hashchange", handler);
            } else {
                arrayRemove(eventHandlers, eventHandlers.indexOf(handler));
            }
            return this;
        },

        /** @description gets or sets a hash querystring value.
         * single querystring value
         * http://localhost/page.htm#?name=Chris
         * get: AppCore.querystring('name');
         * set: AppCore.querystring('name', 'Chris');
         *
         * multiple querystring values
         * http://localhost/page.htm#?name=Chris&location=WI
         * get: AppCore.querystring('name'); AppCore.querystring('location');
         * set: AppCore.querystring({name: 'Chris', location: 'WI' });
         *
         * */
        querystring: function (name, value) {
            var ho = this.query();
            if (arguments.length === 2) {
                ho[name.toLowerCase()] = (value === null ? '' : value);
                return this.setHash(this.root(), ho);
            } else if (arguments.length === 1 && typeof (name) === 'string') {
                return ho[name.toLowerCase()];
            }
            return ho;
        },

        /** @description gets or sets the root hash.
         * The Hash "root" is basically a plain "location.hash" value.
         *
         * Here's a sample url with a hash value specified:
         * http://localhost/page.htm#SomeValue
         *
         * In this example, the value "SomeValue" is the "location.hash" value. In this case, this is also the hash "root" value.
         * get: AppCore.root()
         * set: AppCore.root('SomeValue')
         */
        root: function (value) {
            if (value === undefined) {
                return parseHashRoot(window.location.hash);
            }
            return this.setHash(value, this.querystring());
        },

        //todo setHash
        /** @description sets both the root hash and the hash querystring
         *
         * set root and querystring values
         * http://localhost/page.htm#SomeValue?name=Chris
         * set: AppCore.setHash('SomeValue', {name: 'Chris'});
         * */
        setHash: function (root, query) {
            if (query !== undefined) {
                if(typeof (query) !== "string"){
                    query = objectToHash(query);
                }
                if(query !== ''){
                    query = '?'+query;
                    window.location.hash = root + query;
                }else{
                    window.location.hash = root;
                }
            } else {
                window.location.hash = root;
            }
            return this;
        },

        /** removes a value from the hash querystring*/
        removeQuerystring: function (name) {
            var ho = this.query();
            ho[name.toLowerCase()] = undefined;
            return this.setHash(this.root(), ho);
        },
//todo query
        /** returns an object representation of the hash querystring */
        query: function () {
            return hashToObject(window.location.hash);
        },


        _routes: {},
        _routeHandlerRegistered: false,
        _defaultRoute: null,

        /** @description adds a new route handler.
         *
         * Using Routes you can easily hook in to jHash to have certain code executed only when the "location.hash" is changed to a value that matches a pre-defined Route Pattern.
         * Routes are made up of two main pieces:
         *
         * Route Pattern - a specific route value or a pattern to match using regular expressions.
         * Callback / Handler - a function or method that is called when the "location.hash" is changed to a value that matches the associated Route Pattern.
         * You can create a route pattern that will only match one specific hash. To do this you just create the route with the specific value of the hash you are wanting to match.
         * Here are some example static Route Patterns and Hash values that would match them:
         * Route Pattern  Matching Hash
         * List           #List
         * Home           #Home
         * Folder/23      #Folder/23
         *
         * You can also create route patterns that will use a specific pattern to dynamically match many possible Hash values with that specific pattern. To do this you simply add a value to the Route Pattern that is surrounded by curly braces, like this {folder}.
         * Route Pattern 	Matching Hash
         * Item/4 	#Item/4
         * Item/{id} 	#Item/1
         * Item/{id} 	#Item/2
         * Item/{id} 	#Item/3
         * {entity}/{id} 	#contact/1
         * {entity}/{id} 	#address/23
         * {entity}/{name} 	#State/Wisconsin
         *
         * These dynamic parts of the routes can be named anything. The values of them can even be accessed within the associated Route Handler.
         *
         * Example:
         * AppCore.route('{state}/{city}',
         * function () {
         * // add code here to handle route
         * }
         * );
         *
         * The Route Parts can be accessed by name (the one the are defined with) as properties of the "this" reference within the Route Handler.
         *
         * Here's an example using the above Route Pattern:
         *
         * // Hash that would match this Route Pattern
         * // #Wisconsin/Milwaukee
         *
         * AppCore.route('{state}/{city}',
         * function () {
         * var stateName = this.state;
         * // stateName will equal 'Wisconsin'
         *
         * var cityName = this.city;
         * // cityName will equal 'Milwaukee'
         * }
         * );
         *
         */
        route: function (route, handler) {
            this._routes[route] = handler;

            if (!this._routeHandlerRegistered) {
                this._routeHandlerRegistered = true;
                this.hashchange(routeHandler);
            }
        },
//todo processRoute
        /** @description Forces the current route to be processed.
         * useful for calling on initial page load, after
         * all page initialization has been performed
         */
        processRoute: function () {
            routeHandler();
        },
        parseHash: function(hashUrl){
            var hashObject = {root: parseHashRoot(hashUrl), params:hashToObject(hashUrl)}
            return hashObject;
        },
        /** Gets or sets the default route for the page, when
        * no "root" hash is specified
        */
        defaultRoute: function (root, query) {
            if (arguments.length == 0) {
                return this._defaultRoute;
            }
            this._defaultRoute = {
                root: root,
                query: query
            };
        },
        url: (function(url){
            var url_regexp,
                loc = url,
                matches = loc.href.match( /^((https?:\/\/.*?\/)?[^#]*)#?.*$/ ),
                loc_fragbase = matches[1] + '#',
                loc_hostbase = matches[2];

            function urlInternalHost( alt_hostname ) {
                alt_hostname = alt_hostname
                  ? '(?:(?:' + Array.prototype.join.call( arguments, '|' ) + ')\\.)?'
                  : '';

                var re = new RegExp( '^' + alt_hostname + '(.*)', 'i' ),
                  pattern = '^(?:' + loc.protocol + ')?//'
                    + loc.hostname.replace(re, alt_hostname + '$1').replace( /\\?\./g, '\\.' )
                    + (loc.port ? ':' + loc.port : '') + '/';

                return urlInternalRegExp( pattern );
              };

            function urlInternalRegExp( re ) {
                if ( re ) {
                  url_regexp = typeof re === 'string'
                    ? new RegExp( re, 'i' )
                    : re;
                }

                return url_regexp;
            };
            // Initialize url_regexp with a reasonable default.
            urlInternalHost( 'www' );
            return {
                // Section: Methods
                //
                // Method: jQuery.isUrlInternal
                //
                // Test whether or not a URL is internal. Non-navigating URLs (ie. #anchor,
                // javascript:, mailto:, news:, tel:, im: or non-http/https protocol://
                // links) are not considered internal.
                //
                // Usage:
                //
                // > jQuery.isUrlInternal( url );
                //
                // Arguments:
                //
                //   url - (String) a URL to test the internal-ness of.
                //
                // Returns:
                //
                //  (Boolean) true if the URL is internal, false if external, or undefined if
                //  the URL is non-navigating.

                isInternalUrl : function( url ) {

                    // non-navigating: url is nonexistent or a fragment
                    if ( !url || this.isFragmentUrl( url ) ) { return undefined; }

                    // internal: url is absolute-but-internal (see $.urlInternalRegExp)
                    if ( url_regexp.test(url) ) { return true; }

                    // external: url is absolute (begins with http:// or https:// or //)
                    if ( /^(?:https?:)?\/\//i.test(url) ) { return false; }

                    // non-navigating: url begins with scheme:
                    if ( /^[a-z\d.-]+:/i.test(url) ) { return undefined; }

                    return true;
                },

                // Method: jQuery.isUrlExternal
                //
                // Test whether or not a URL is external. Non-navigating URLs (ie. #anchor,
                // mailto:, javascript:, or non-http/https protocol:// links) are not
                // considered external.
                //
                // Usage:
                //
                // > jQuery.isUrlExternal( url );
                //
                // Arguments:
                //
                //   url - (String) a URL to test the external-ness of.
                //
                // Returns:
                //
                //  (Boolean) true if the URL is external, false if internal, or undefined if
                //  the URL is non-navigating.

                isExternalUrl: function( url ) {
                    var result = this.isInternalUrl( url );

                    return typeof result === 'boolean'
                        ? !result
                        : result;
                },

                // Method: jQuery.isUrlFragment
                //
                // Test whether or not a URL is a fragment in the context of the current page,
                // meaning the URL can either begin with # or be a partial URL or full URI,
                // but when it is navigated to, only the document.location.hash will change,
                // and the page will not reload.
                //
                // Usage:
                //
                // > jQuery.isUrlFragment( url );
                //
                // Arguments:
                //
                //   url - (String) a URL to test the fragment-ness of.
                //
                // Returns:
                //
                //  (Boolean) true if the URL is a fragment, false otherwise.

                isFragmentUrl: function( url ) {
                    var matches = ( url || '' ).match( /^([^#]?)([^#]*#).*$/ );

                    // url *might* be a fragment, since there were matches.
                    return !!matches && (

                        // url is just a fragment.
                        matches[2] === '#'

                            // url is absolute and contains a fragment, but is otherwise the same URI.
                            || url.indexOf( loc_fragbase ) === 0

                            // url is relative, begins with '/', contains a fragment, and is otherwise
                            // the same URI.
                            || ( matches[1] === '/' ? loc_hostbase + matches[2] === loc_fragbase

                            // url is relative, but doesn't begin with '/', contains a fragment, and
                            // is otherwise the same URI. This isn't even remotely efficient, but it's
                            // significantly less code than parsing everything. Besides, it will only
                            // even be tested on url values that contain '#', aren't absolute, and
                            // don't begin with '/', which is not going to be many of them.
                            : !/^https?:\/\//i.test( url ) && $('<a href="' + url + '"/>')[0].href.indexOf( loc_fragbase ) === 0 )
                        );
                }
            }
        })(window.location),
        hashObject: function(object){
            var result = SHA1(objectToHash(object));
            return result;
        },
        run: function(){
            if(!_appRunning){
                this.publish('onStart');
                _appRunning = true;
            }
        }

    };
    //adds console to the app if it is avaliable, if not it fills console with empty methods to prevent IE from throwing errors.
    if(consoleSupported){
        if(consoleAssignSupported){
            for(var i = 0, length = _console.length; i < length; i++){
                appCore[_console[i]] = console[_console[i]];
            }
        }else{
            for(var i = 0, length = _console.length; i < length; i++){
                appCore[_console[i]] = (function(n) {return function() {return console[n].apply(console, arguments);};})(_console[i]);
            }
        }

    }else{
        for(var i = 0, length = _console.length; i < length; i++){
            appCore[_console[i]] = function(){};
        }
    }
    appCore.hashchange(function(){
//        appCore.publish('url-change',{root:appCore.root(), params:appCore.query()})
    });
    appCore.subscribe('onStart',function(){
        appCore.processRoute();
//        var root = appCore.root();
//          appCore.publish('url-change',{root: root, params:appCore.query()})
    },{priority:999})


    global.AppCore = appCore;
    return appCore;

}(this));

AppCore.extendApi({
    /*
     @description Finds dom element within the context of of the module if module is associated with with DOM elements in the Document. Uses jQuery.
     @example Equivalent for that would be $.getContainer().find(selector)
     */
    find : function (selector) {
        return this.getContainer().find(selector);
    },

    /*
     @description Attach an event handler to the module. The event triggered by specified element within the module only needs to bubble up just enough to reach the dom object associated with module before it can execute handler, and not all the way up to the document root. This drastically improves performance of Dom Events. All events of all types can have a specific namespace such as "click.exampleNamespace". Event type 'click' ins namespace 'exampleNamespace'. Uses jQuery.
     @example $("p").off( "click", "**" ). Equivalent for that would be $.getContainer().on(events, selector, data, handler )
     */
    on : function (event, selector, data, handler) {
        return this.getContainer().on.apply(this.getContainer(), arguments);
    },

    /*
     @description Remove an event handler from the module. To remove all delegated events from the module without removing non-delegated events, use the special value "**". All events of all types in a specific namespace can be removed from the module by providing just a namespace, such as "click.exampleNamespace", where 'click is event type and 'exampleNamespace' is namespace. Uses jQuery.
     @example Equivalent for that would be $.getContainer().off(events, selector, handler )
     */
    off : function (event, selector, handler) {
        return this.getContainer().off.apply(this.getContainer(), arguments);
    },
    /*
     @description Shorthand version of
     $.busy(function(){}) == $.subscribe('app_busy', function(){})
     $.busy(false) == $.unsubscribe('app_busy')
     $.busy() == $.publish('app_busy')
     */
    busy: function(handler){
        if(arguments.length === 0){
            this.publish('app_busy');
        }else{
            if(arguments.length === 1){
                if(typeof handler === 'function'){
                    this.subscribe('app_busy', handler);
                }else{
                    if(typeof handler === 'boolean' && handler === false){
                        this.unsubscribe('app_busy')
                    }
                }
            }
        }
    },
    /*
     @description Shorthand version of
     $.unblock(function(){}) == $.subscribe('app_continue', function(){})
     $.unblock(false) == $.unsubscribe('app_continue')
     $.unblock() == $.publish('app_continue')
     */
    unblock: function(handler){
        if(arguments.length === 0){
            this.publish('app_continue');
        }else{
            if(arguments.length === 1){
                if(typeof handler === 'function'){
                    this.subscribe('app_continue', handler);
                }else{
                    if(typeof handler === 'boolean' && handler === false){
                        this.unsubscribe('app_continue')
                    }
                }
            }
        }

    }
},'jquery');

AppCore.extend({
    loadImages: function ($images, options) {
        var _progress = function(){}, _complete = function(){}, _progressBar = true;
        if((arguments.length === 2) && (typeof options === "object")){
            if(options.progress !== undefined && typeof options.progress === "function"){
                _progress = options.progress;
            }
            if(options.complete !== undefined && typeof options.complete === "function"){
                _complete = options.complete;
            }
            if(options.progressBar !== undefined && typeof options.progressBar === "boolean"){
                _progressBar = options.progressBar;
            }

        }
        function filterImages($img){
            if(typeof $img === 'string'){
                var $images = jQuery('<img src="'+$img+'" />');
            }else{
                var $images = $img.not('.no-preload');
            }

            $images.addClass('loading');
            return $images
        }
        var progressWrap = jQuery('#progress-wrapper'),
            progress = jQuery('#progress'),
            progressBar = progress.find('.bar'),
            $img = filterImages($images),
            length = $img.length,
            index = 0,
            progressId;

        // Reset progress bar
        if(_progressBar){
            /*progressBar.text('0%');*/
            progressWrap.show();
        }
        $img.imgpreload({
            each: function()
            {
                // this = dom image object
                // check for success with: $(this).data('loaded')
                // callback executes when each image loads
                index++;
                progressId = Math.round( ( ( index ) * 100 ) / length );
                if(_progressBar){
                    /*progressBar.text(progressId + '%');*/
                }
                _progress.apply(jQuery(this))
            },
            all: function()
            {
                // this = array of dom image objects
                // check for success with: $(this[i]).data('loaded')
                // callback executes when all images are loaded
                setTimeout(function(){
                    progressWrap.hide();
                    /*progressBar.text('0%');*/
                },400)
                _complete.apply(this)
            }
        });
    },
    findImageSize: function(image, callback){
        var _callback;
        if((arguments.length === 2) && (typeof callback === "function")){
            _callback = callback;
        }else{
            _callback = function(w, h ) {};
        }
        /*http://uihacker.blogspot.com.au/2012/03/javascript-get-original-size-of-image.html*/
        var GetImageSize = function( src, callback ) {
            this.image = new Image();
            if(typeof src === 'string'){
                this.src = src;
                this.jq = this.image;
            }else{
                this.src = src.attr('src');
                this.jq = src;
            }
            this.callback = callback;
            this.requestImageSize()
        };

        GetImageSize.prototype.requestImageSize = function () {
            var self = this;
            // create load/error callbacks
            this.image.onload = function () {
                if( self.callback ){
                    self.callback.apply(self.jq, [self.image.width, self.image.height] );
                }
                self.cleanup();
            };
            this.image.onerror = function () {
                if( self.callback ) {
                    self.callback.apply(self.jq,[-1, -1] );
                }
                self.cleanup();
            };
            // load it
            this.image.src = this.src;
        };

        GetImageSize.prototype.cleanup = function() {
            delete this.image;
            delete this.src;
            delete this.callback;
        };

        new GetImageSize( image, _callback );
    },
    _scaleImage: function(image, callback){
        var _callback;
        if((arguments.length === 2) && (typeof callback === "function")){
            _callback = callback;
        }else{
            _callback = revealImages;
        }
        /*The function above takes 5 parameters:

         srcwidth – integer width of the source image that we want to scale
         srcheight – integer height of the source image that we want to scale.
         targetwidth – integer width of the parent element that we want to fit the image into
         targetheight – integer height of the parent element that we want to fit the image into
         fLetterBox – True if we want the “fitted” mode. Otherwise, the function uses the “zoom” mode.

         The function above returns an object with the following properties defined:

         width – new width that should be applied to the image for scaling
         height – new height that should be applied to the image for scaling
         targetleft – What the left position attribute of the image should be (can be negative)
         targettop – What the top position attribute of the image should be (can be negative)
         fScaleToTargetWidth – bool indicating which dimension was clamped down to fit exactly the size of the parent. (The other dimension was set to keep the aspect ratio correct).

         compute the new size and offsets:
         var result = ScaleImage(w, h, tw, th, false);
         */
        function ScaleImage(srcwidth, srcheight, targetwidth, targetheight, fLetterBox) {

            var result = { width: 0, height: 0, fScaleToTargetWidth: true };

            if ((srcwidth <= 0) || (srcheight <= 0) || (targetwidth <= 0) || (targetheight <= 0)) {
                return result;
            }

            // scale to the target width
            var scaleX1 = targetwidth;
            var scaleY1 = (srcheight * targetwidth) / srcwidth;

            // scale to the target height
            var scaleX2 = (srcwidth * targetheight) / srcheight;
            var scaleY2 = targetheight;

            // now figure out which one we should use
            var fScaleOnWidth = (scaleX2 > targetwidth);
            if (fScaleOnWidth) {
                fScaleOnWidth = fLetterBox;
            }
            else {
                fScaleOnWidth = !fLetterBox;
            }

            if (fScaleOnWidth) {
                result.width = Math.floor(scaleX1);
                result.height = Math.floor(scaleY1);
                result.fScaleToTargetWidth = true;
            }
            else {
                result.width = Math.floor(scaleX2);
                result.height = Math.floor(scaleY2);
                result.fScaleToTargetWidth = false;
            }
            result.targetleft = Math.floor((targetwidth - result.width) / 2);
            result.targettop = Math.floor((targetheight - result.height) / 2);

            return result;
        };
        function revealImages(){
            var $image = this,
                loaded = $image.data('loaded')?true:false;
            if( loaded ){
                $image.addClass('loaded').removeClass('loading');
            } else {
                $image.addClass('loaded').removeClass('loading').addClass('broken');
            }
        };
        function filterImages($img){
            var $imagesToScale = $img.not('.no-scale');
            var $noScaleImages = $img.filter('.no-scale');
            if($noScaleImages.length > 0){
                revealImages.apply($noScaleImages);
            }
            return $imagesToScale
        }
        //Add class "no-scale" to the image to prevent certain images from scaling
        image = filterImages(image);

        if(image.length > 0){
            image.addClass('loading');
            image.each(function(index){
                var $this = jQuery(this),
                    $parent = $this.parent(),
                    w = $this.attr('data-width'),
                    h = $this.attr('data-height'),
                    parentHeight = $parent.height(),
                    parentWidth = $parent.width(),
                    imageScale = ScaleImage(w, h, parentWidth , parentHeight, false);
                $this.addClass('scale').attr({
                    'data-scale-width': imageScale.width,
                    'data-scale-height': imageScale.height,
                    'data-scale-top': imageScale.targettop,
                    'data-scale-left': imageScale.targetleft
                });
                var height = imageScale.height;
                var width = imageScale.width;
                var top = imageScale.targettop;
                var left = imageScale.targetleft;
                $this.css({'left': left, 'top': top, 'height': height, 'width': width });
                _callback.apply($this);
            })

        }

    },
    scaleImage: function(image, callback){
        var self = this;
        if(image.attr('data-width') !== undefined){
            self._scaleImage(image, callback)
        }else{
            self.findImageSize(image, function(w, h){
                jQuery(this).attr({
                    'data-width': w,
                    'data-height': h
                })
                self._scaleImage(image, callback);
            })
        }

    },
    loadAndScale: function(images, progressBar, callback){
        var self = this;
        self.loadImages(images, {
            progressBar : typeof progressBar === 'boolean' ? progressBar : true ,
            progress: function(){
                self.scaleImage(this, callback)
            }
        })
    }
})

