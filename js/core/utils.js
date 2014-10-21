(function (w, $, PEB) {
    "use strict";
    var Prefs = {},
        debugLog = function () {
            if (w.console && w.console.log) {
                w.console.log(Array.prototype.slice.call(arguments));
            }
        },
        curBP = 'mobile';

    Prefs.BreakPoints = {mobile: 0, phablet: 30, tablet: 42, web: 62.5};
    Prefs.emSize = 16;

    (function (p) {
        p.BreakPointRanges = {
            'ranges' : {},
            'order' : []
        };

        function _mediaQueryOnlyStr(min, max){
            var mq = ['screen'];
            if ($.type(min) === 'number') {
                mq.push('(min-width:' + min + 'em)');
            }
            if ($.type(max) === 'number') {
                mq.push('(max-width:' + max + 'em)');
            }
            return mq.join(' and ');
        }

        var j,
            bpRanges = $.map(
                p.BreakPoints,
                function (v, k) {
                    j = {
                        'bp' : k,
                        'r':{
                            'min': v
                        }
                    };

                    return j;
                }
            ).sort(
                function (a, b) {
                    return a.r.min - b.r.min;
                }
            ),
            len = bpRanges.length;

        $.each(bpRanges, function (i, v) {
            j = i + 1;
            v.r.index = i;
            p.BreakPointRanges.ranges[v.bp] = v.r;
            p.BreakPointRanges.order[i] = v.bp;

            if (j >= len) {
                return false;
            }

            p.BreakPointRanges.ranges[v.bp].max = ((bpRanges[j].r.min * p.emSize) - 1) / p.emSize;

        });

        if ($.type(w.matchMedia) === 'function') {

            $.each(p.BreakPointRanges.ranges, function (k, v) {
                j = _mediaQueryOnlyStr(v.min, v.max);
                debugLog('media query: ' + j);

                (p.BreakPointRanges.ranges[k].mediaQueryMatch = w.matchMedia(j)).addListener(
                    function (mql) {
                        if (mql.matches) {
                            debugLog('mediaQuery: ' + k);
                            PEB('breakPoint', {
                                'args': {
                                    'breakpoint':  (curBP = k)
                                }
                            });
                        }
                    }
                );

                if (p.BreakPointRanges.ranges[k].mediaQueryMatch.matches) {
                    PEB('breakPoint', {
                        'args': {
                            'breakpoint':  (curBP = k)
                        }
                    });
                }
            });
        }

    }(Prefs));

    (function () {
        var rTimer,
            sTimer,
            bouncedResize = function () {
                if (rTimer) {
                    clearTimeout(rTimer);
                }
                rTimer = setTimeout(function () {
                    PEB('windowResize');
                }, 150);
            },
            bouncedScroll = function () {
                if (sTimer) {
                    clearTimeout(sTimer);
                }
                sTimer = setTimeout(function () {
                    PEB('windowScroll');
                }, 150);
            };

        $(w).resize(bouncedResize).scroll(bouncedScroll);
    }());
}(window, jQuery, PriorityEventBroadcaster));
