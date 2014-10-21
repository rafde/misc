//Ctrl
/*global EventPriorityBroadcaster*/
var Ctrl = (function (W, $, EPB) {
    'use strict';

    EPB = EPB || function () {};

    /**
     * @constructor Ctrl
     */
    var pageElementStyle = document.createElement('p').style,
        debugLog = function () {
            if (W.console && W.console.log) {
                W.console.log(Array.prototype.slice.call(arguments));
            }
        },
        bpIndex = {},
        bpOrder = $.map(
            {mobile: 0, /*phablet: 30,*/ tablet: 42, web: 62.5},
            function (v, k) {
                return {'bp': k, 'w': v};
            }
        ).sort(
            function (a, b) {
                return a.w - b.w;
            }
        ),
        tsEffect = [
            {
                'styleProp': 'transition',
                'start': 'transitionstart',
                'end' : 'transitionend'
            },
            {
                'styleProp': 'WebkitTransition',
                'start': 'webkitTransitionStart',
                'end' : 'webkitTransitionEnd'
            },
            {
                'styleProp': 'MozTransition',
                'start': 'transitionstart',
                'end' : 'transitionend'
            },
            {
                'styleProp': 'OTransition',
                'start': 'otransitionend',
                'end' : 'otransitionend'
            }
        ];

    bpOrder = $.map(
        bpOrder,
        function (v, i) {
            bpIndex[v.bp] = i;
            return v.bp;
        }
    );

    $.each(tsEffect, function (i, v) {
        if (v.styleProp in pageElementStyle) {
            tsEffect = v;
            return false;
        }
    });

    if ($.type(tsEffect) === 'array') {
        tsEffect = null;
    }

    /**
     * @this Ctrl
     * @param {object|undefined} inheritProps
     * @param {object|undefined} staticProps
     * @returns {Child}
     */
    function extend(inheritProps, staticProps) {
        var Parent = this,
            Proxy = function () {},
            Child = function () {
                Parent.apply(this, arguments);
            };

        $.extend(Child, Parent);

        if ($.type(staticProps) === 'object') {
            $.extend(true, Child, staticProps);
        }

        Proxy.prototype = Parent.prototype;
        Child.prototype = new Proxy();

        if ($.type(inheritProps) === 'object') {
            $.extend(Child.prototype, inheritProps);
        }

        Child.prototype.__myParent = Parent;
        Child.constructor = Child;
        return Child;
    }

    /**
     * @description Return normalized event broadcast name
     * @this Ctrl
     * @param {string} eventName
     * @returns {string}
     * @private
     */
    function _returnEventName(eventName) {
        var ctrlName = this._ctrlName || this.prototype._ctrlName;

        if (eventName.indexOf(ctrlName) !== 0) {
            eventName = ctrlName + eventName.charAt(0).toUpperCase() + eventName.slice(1);
        }
        return eventName;
    }

    /**
     * @this Ctrl
     * @param {string} eventTag
     * @param {object} args
     * @returns {Ctrl}
     */
    function eventBroadcast(eventTag, args) {
        if (eventTag && $.type(eventTag) === 'string' && args && $.type(args) === 'object') {

            EPB(_returnEventName.apply(this, [eventTag]), {'pub' : args});
        }

        return this;
    }

    /**
     * @param {object} config
     * @this Ctrl
     * @private
     */
    function __setupConfig(config) {
        var defaultConfig = this._defaultConfig,
            moduleConfig = this.$root.data('moduleConfigs');

        debugLog(this._ctrlName + ' function config', config);

        if ($.type(defaultConfig) !== 'object') {
            defaultConfig = {'mobile': {}};
        }

        if ($.type(defaultConfig.mobile) !== 'object' &&
            !(defaultConfig.phablet || defaultConfig.tablet || defaultConfig.web)
        ) {
            defaultConfig = {'mobile' : defaultConfig};
        }

        debugLog(this._ctrlName + ' default config', defaultConfig);

        if ($.type(moduleConfig) === 'object' &&
            $.type((moduleConfig = moduleConfig[this._ctrlName])) === 'object'
            ) {

            if (!(moduleConfig.mobile || moduleConfig.phablet || moduleConfig.tablet || moduleConfig.web)) {
                moduleConfig = {'mobile' : moduleConfig};
            }

        } else {
            moduleConfig = {'mobile': {}};
        }

        this._config = $.extend(true, {mobile : {}}, defaultConfig, moduleConfig, config);

    }

    /**
     * @this Ctrl
     * @private
     */
    function __delegateEvents() {
        var Ctrl = this,
            $root = this.$root,
            ctrlClass = this._ctrlName,
            cn = '.' + ctrlClass;

        if ($.type(this._events) === 'object') {
            $.each(this._events, function (selector, events) {

                if ($.type(events) === 'object' && !($.isEmptyObject(events))) {

                    $.each(events, function (eventType, fn) {
                        //support prefix events
                        if (eventType === 'transitionend') {

                            if (tsEffect) {
                                eventType = tsEffect.end;
                            } else {
                                debugLog(ctrlClass + ': event ' + eventType + ' is unsupported. :-(');
                                return;
                            }
                        }

                        var eventNS = eventType.split(' ').join(cn + ' ') + cn;

                        debugLog(ctrlClass + ':' + eventNS);

                        $root.on(
                            eventNS,
                            selector,
                            function (ev) {
                                var args, obj;

                                //TODO: better way to figure deactivated utils
                                if ($root.hasClass(ctrlClass)) {
                                    args = Array.prototype.slice.call(arguments);

                                    obj = {
                                        $delegateTarget : $root,
                                        Ctrl : Ctrl,
                                        $currentTarget : $(ev.currentTarget),
                                        event : ev
                                    };

                                    if (args.length && args[0] instanceof $.Event) {
                                        args[0].CtrlObj = {
                                            $delegateTarget : $root,
                                            Ctrl : Ctrl,
                                            $currentTarget : obj.$currentTarget
                                        };
                                    }

                                    //obj will always be the last param
                                    args.push(obj);

                                    switch ($.type(fn)) {
                                        case 'function':
                                            fn.apply(this, args);
                                            break;
                                        case 'string':
                                            if (fn.indexOf('_PEB') >= 0 && fn.length > 5) {
                                                Ctrl.eventBroadcast(fn.substr(5), obj);
                                            }
                                            break;
                                    }
                                }
                            }
                        );
                    });
                }
            });
        }
    }

    /**
     * @description Controller constructor. Executes boilerplate functions.
     * @param {jQuery|string|DOM}   $e
     * @param {object} config       options object config
     * @constructor
     */
    function Ctrl($e, config) {
        var me = this;

        this.$root = $e;
        this.__preInit();
        $e.data((this._ctrlName || 'util') + 'Ctrl', this);
        __delegateEvents.apply(this);
        __setupConfig.apply(this, [(config || {})]);

        EPB('breakPoint', {
            'rePub' : true,
            //Do not give this atag.
            'sub': function (args) {
                debugLog('Updating breakPoint config for: ' + me._ctrlName, me.getBpConfig(args.breakpoint));

                if (me._bpConfig === null) {
                    me.$root.removeClass(me._ctrlName);
                    me._onDisabled();
                } else if ($.type(me.__ran) === 'undefined') {
                    me.$root.addClass(me._ctrlName);
                    me.__init();
                    me.configure();
                    me.__postInit();
                    me.__ran = true;
                } else {
                    me.$root.addClass(me._ctrlName);
                    me._onEnabled();
                }

            }
        });

    }

    Ctrl.prototype._ctrlName = 'util';

    Ctrl.prototype._events = {};

    Ctrl.prototype._defaultConfig = {'tpl' : ''};

    Ctrl.prototype.__preInit = function () {};

    Ctrl.prototype.__init = function () {};

    Ctrl.prototype.__postInit = function () {};

    Ctrl.prototype.getBpConfig = function (currentBp) {
        var config = null,
            i = 0,
            stop,
            bp,
            bpType;

        if ($.type(currentBp) !== 'string' || $.type(bpIndex[currentBp]) === 'undefined') {
            currentBp = 'mobile';
        }

        stop = bpIndex[currentBp];

        for (; i <= stop; i++) {
            bp = bpOrder[i];
            bpType = $.type(this._config[bp]);

            //If this breakpoint config is null, then this won't config
            if (currentBp === bp && bpType === 'null') {
                config = null;
                break;
            }

            if (bpType === 'object') {
                config = $.extend(true, config, this._config[bp]);
            }
        }

        return (this._bpConfig = config);
    };

    Ctrl.prototype._props = {
        'transitionSupport' : ($.type(tsEffect) === 'object'),
        'hasTransitions' : ($.type(tsEffect) === 'object'),
        'hasColumns': ('columnCount' in pageElementStyle) || ('webkitColumnCount' in pageElementStyle) || ('mozColumnCount' in pageElementStyle)
    };

    Ctrl.prototype.configure = function () {};

    /**
     * @description broadcast event data.
     * @function eventBroadcast
     * @static
     * @param {string} eventTag
     * @param {object} args     mapped values to pass to the event broadcast listeners
     * @returns {Ctrl}
     */
    Ctrl.eventBroadcast = Ctrl.prototype.eventBroadcast = eventBroadcast;

    /**
     * @description Apply animation to target element. Uses jQuery animate if cssTransition isn't browser supported
     * @public
     * @param {object}          obj
     * @param {object|string}   props   CSS properties
     * @param {string}          eventTag
     * @param {object}          opts    map of additional options to pass to jQuery().animate
     * @returns {Ctrl}
     */
    Ctrl.prototype.transition = function (obj, props, eventTag, opts) {
        var ctrl = this,
            config = ctrl._bpConfig,
            jsAnimProps;

        if ($.type(obj) === 'object' &&
            (obj.$currentTarget instanceof $) &&
            obj.$currentTarget.length &&
            $.type(eventTag) === 'string'
            ) {

            if ($.type(props) === 'string' &&
                config && config.animProps &&
                $.type(config.animProps[props]) === 'object'
                ) {
                props = config.animProps[props];

            } else if ($.type(props) !== 'object') {
                return this;
            }

            if (this._props.transitionSupport) {
                obj.$currentTarget.css(props);
            } else {
                jsAnimProps = {
                    'done' : function (Animation, didJumpedToEnd) {
                        debugLog('jsAnimation');
                        ctrl.eventBroadcast(eventTag, $.extend({'Animation' : Animation, 'didJumpToEnd' : didJumpedToEnd}, obj));
                    }
                };

                if ($.type(opts) === 'object') {
                    jsAnimProps = $.extend(opts, jsAnimProps); //opts should not override jsAnimProps
                }

                obj.$currentTarget.animate(props, jsAnimProps);
            }
        }

        return this;
    };

    Ctrl.prototype._onDisabled = function () {};
    Ctrl.prototype._onEnabled = function () {};

    //static
    /**
     * @description Creates a new constuctor that inherits from Ctrl.
     * @public
     * @static
     * @param {object} inheritProps
     * @param {object} staticProps
     * @returns {Ctrl}
     */
    Ctrl.extend = extend;

    /**
     * @description Defines Events Names and delete reference since it only needs to run once.
     * @returns {Ctrl}
     */
    Ctrl.eventBroadcastBind = function () {
        var me = this,
            peb = me._eventBroadcast;

        //$(document).ready(function () {

            if ($.type(peb) === 'object') {
                $.each(peb, function (handleName, peb) {
                    var eventBroadcastName = _returnEventName.apply(me, [handleName]);

                    if ($.type(peb) === 'array') {
                        $.each(peb, function (i, v) {
                            if ($.type(v) === 'object' && $.type(v.sub) === 'function') {
                                EPB(eventBroadcastName, v);
                            }
                        });
                    }
                });
                //Only need to bind events once
                delete me._eventBroadcast;
            }
        //});

        return this;
    };

    Ctrl.getName = function () {
        return this.prototype._ctrlName;
    };

    Ctrl.getType = function () {
        return this.prototype._ctrlType;
    };
    /**
     * @description Target elements to start passing to controller. Only need to use once.
     * @public
     * @static
     * @param {string|jQuery|DOM} el target DOM element, selector, jQuery object, Array
     * @returns {Ctrl}
     */
    Ctrl.onReady = function (el) {
        var ThisCtrl = this,
            ctrlName = this.prototype._ctrlName;

        //$(document).ready(function () {
            $(el).each(function (i, e) {
                var $e = $(e);
                if (!$e.data(ctrlName + 'Ctrl')){
                    new ThisCtrl($e);
                }
            });
        //});

        return this;
    };
    /**
     * @description Initializes EventPriorityNames and target elements. Only need to use once.
     * @public
     * @static
     * @param {string|jQuery|DOM} el target DOM element, selector, jQuery object, Array
     * @returns {Ctrl}
     */
    Ctrl.init = function (el) {
        /*var ctrlType = this.getType();

        if ($.type(ctrlType) === 'string' && ctrlType) {
            createInitializer(this);
        }*/
        return this.eventBroadcastBind().onReady(el);
    };

    return Ctrl;
}(window, jQuery, EventPriorityBroadcaster));
