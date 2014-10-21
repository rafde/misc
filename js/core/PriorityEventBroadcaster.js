var PriorityEventBroadcaster = (function (w) {
    'use strict';

    var priorityList = document.createDocumentFragment(),
        priorityType = ['pre', 'def', 'post'],
    //priorityLimit = 11,
        debugLog = function () {
            var args;
            if (w.console && w.console.log) {
                args = Array.prototype.slice.call(arguments);
                args.unshift('PEB');
                w.console.log(Array.prototype.slice.call(arguments));
            }
        };

    function _getPriority(priorityName) {
        var priority = priorityList.querySelector('#'+priorityName);

        if (!priority) {
            priority = _makePriority(priorityName);
        }

        return priority;
    }

    function _makePriority(priorityName) {
        debugLog('creating priority ' + priorityName);
        var priority = document.createElement('priority');
        priority.id = priorityName; //@todo: regex against id qualifier
        priorityList.appendChild(priority);
        return priority;
    }

    function _sub(priorityName, config) {
        var priority = _getPriority(priorityName),
            pTag,
            temp;

        if (config && typeof config === 'object') {

            pTag = document.createElement('pTag');
            pTag.pubCallback = config.callback;
            pTag.id = typeof config.tag === 'string' ? config.tag : 'pr-' + Math.ceil(Math.random() * 10000000); //@todo: regex against id qualifier
            pTag.className = typeof (temp = config.timing) === 'number' && temp >=0 && temp < priorityType.length ? priorityType[temp] : priorityType[0];

            debugLog(pTag);

            if (
                (temp = priority.querySelector('#' + pTag.id)) !== null ||
                (pTag.className === 'def' && (temp = priority.querySelector('.def')) !== null)
            ) {
                debugLog('default replaced ', temp, ' with ', pTag);
                priority.replaceChild(pTag, temp);
            } else {
                priority.appendChild(pTag);
            }

            if(config.repub && priority.hasExec) {
                pTag.pubCallback.call(null, priority.args);
            }

            return pTag;
        }

        return null;
    }

    function _pub(priorityName, args) {
        var priority = _getPriority(priorityName),
            idx = 0,
            sidx = 0,
            pt,
            tags,
            ptl;

        debugLog('publishing to priority ' + priority.id);
        priority.args = args;
        priority.hasExec = true;

        for (pt = priorityType[0]; pt; pt = priorityType[++idx]) {
            tags = priority.querySelectorAll('.' + pt);

            if (tags.length) {
                sidx = 0;
                for(ptl = tags[0]; ptl; ptl = tags[++sidx]) {
                    debugLog('publishing to tag ' + ptl.id);
                    ptl.pubCallback.call(null, args);
                }
            }
        }
    }

    return function (priorityName, options) {
        options = options || {};

        if (typeof priorityName === 'string' && typeof options === 'object') {

            options.args = options.args || {};

            if (options.unsub) { //unsubscribe priorityName and tag

                _unsub(priorityName, options);

            } else if (typeof options.callback === 'function') { //subscribe to priorityName

                if(_sub(priorityName, options) === null) {
                    debugLog('Subscription definition was invalid and was not registered');
                }

            } else { //publish to priorityName
                _pub(priorityName, options.args);
            }
        }
    };
}(window));