/*global EventPriorityBroadcaster, Ctrl*/
var SliderStrip = (function (Ctrl, $, EPB) {
    'use strict';
	//Private functions and vars
	var SliderStrip,
		animationClass = 'slidingStrip',
		sliderDebug = function () {
            if (window.console && window.console.log) {
                window.console.log(Array.prototype.slice.call(arguments));
            }
        },
		ctrlName = 'sliderStrip',
		childrenCriteria = ':visible:not(:empty)';

	function _createPageIndices(newPages) {

		var temp = '',
			$slidePager,
			$slideIndex,
			slideIndexClass = 'pageIndex',
			indexLength,
			p;

		this.$slidePager.each(function (i, e) {
			var isNotSelected = true;

			$slidePager = $(e);
			$slideIndex = $slidePager.children('.' + slideIndexClass);
			indexLength = $slideIndex.length;

			if (indexLength < newPages) {

				for (p = (indexLength + 1); p <= newPages; p += 1) {

					temp += '<a class="' +
							slideIndexClass;

					if (indexLength <= 0 && isNotSelected) {
						temp += ' selectedIndex';
						isNotSelected = false;
					}

					temp = temp +
							'" href="#">' +
							p +
							'</a>';

				}

				$slidePager.append(temp);
			}

			$slideIndex.removeClass('offPage') //lazy
				.filter(':gt(' + (newPages - 1) + ')')
					.addClass('offPage');

			temp = '';
		});

		this.$slideOf.text(newPages);
	}

	function _updateIndexPos() {
		var pageIndex = this._pageIndex;

		if (this.$slidePager.length) {
			_createPageIndices.apply(this, [this._maxPages]);

			this.$slidePager.each(function (i, e) {
				$(e).children('.pageIndex').eq(pageIndex).addClass('selectedIndex')
					.siblings('.selectedIndex').removeClass('selectedIndex');
			});
		}

		this.$slideNum.text(pageIndex + 1);
	}

	//Update the margin offset and page index values
	function _updatePos(newPage, useAnim) {
		var $sliderStrip = this.$root,
			$firstTrack = this.$slideTrack.eq(0),
			$firstItem = $firstTrack.children(childrenCriteria).eq(0),
			$secondItem = $firstItem.next(childrenCriteria),
			props = {},
			pxMargin = -newPage,
			percentMargin = (-newPage * this._marginPercentage),
			useMargin;

		if ((newPage + 1) === this._maxPages) {
			pxMargin = -$firstTrack.eq(-1).children(childrenCriteria).length + this._maxViewable;

			if(this._bpConfig.slideRemainder) {
				percentMargin += (this._percentWidth * this._itemRemainder);
				percentMargin = percentMargin.toFixed(3);//string
			}
		} else {
			pxMargin = pxMargin * this._maxViewable;
		}

		percentMargin += '%';

		pxMargin = pxMargin * $secondItem.outerWidth(true);

		useMargin = percentMargin;
		if (this._bpConfig.fitTrack) {
			useMargin = pxMargin;
		}

		if (this._bpConfig.threshold) {
			useMargin = pxMargin - this._bpConfig.threshold;
		}

		this._pageIndex = newPage;
		this._currentMargin = pxMargin;

		props.marginLeft = useMargin;

		sliderDebug(['NEW margin', useMargin]);
		sliderDebug(['NEW index', this._pageIndex]);

		this._updateInteractions();

		$firstItem.stop();

		if (useAnim === false) {
			sliderDebug('noAnimation');
			$firstItem.css(props);
		} else {
			$sliderStrip.addClass(animationClass);
			this.transition(
				{
					'$delegateTarget' : $sliderStrip,
					'$currentTarget' : $firstItem,
					'Ctrl' : this,
					'event' : {}
				},
				props,
				'TransitionEnd',
				{
					duration : 500
				}
			);
		}
	}

	function _updateNextPrev() {
		var pState,
			nState;

		pState = nState = 'removeClass';

		sliderDebug(['CURRENT INDEX', this._pageIndex]);
		if (this._pageIndex <= 0) {
			pState = 'addClass';
		}
		sliderDebug(['CURRENT MAX', this._maxPages]);
		if ((this._pageIndex + 1) >= this._maxPages) {
			nState = 'addClass';
		}

		this.$slidePrev[pState]('disabled');
		this.$slideNext[nState]('disabled');
	}

	function _slideDirection(num, obj) {
		obj.event.preventDefault();
		if (!obj.Ctrl.isDisabled()) {
			obj.num = num;
			obj.Ctrl.eventBroadcast('Sliding', obj);
		}
	}

	//Repeated Event handlers
	function _prevPage() {
		_slideDirection('prev', arguments[arguments.length - 1]);
	}


	function _nextPage() {
		_slideDirection('next', arguments[arguments.length - 1]);
	}

	function _adjustSliderStrip($els) {
		var $s = $els instanceof jQuery ? $els : $('.' + ctrlName);

		$s.each(function (i, e) {
			var Ctrl = $(e).data(ctrlName + 'Ctrl'),
				ctrlType = $.type(Ctrl);

			if (ctrlType === 'object' || ctrlType === 'function') {
				if ($.type(Ctrl.updateTrack) === 'function') {
					Ctrl.updateTrack();
				}
			}
		});
	}

	/* This could be inherited from a JS parent controller */
	/* START Parent Controller */
	SliderStrip = Ctrl.extend(
		{
			_ctrlName : ctrlName,
			'_ctrlType': 'Utils',
			_events : {
				'.pageIndex' : {
					tap : function () {
						var obj = arguments[arguments.length - 1];
						//TODO: Index by slideIndex, not sibling
						_slideDirection(obj.$currentTarget.index(), obj);
					}
				},
				'.slideTrack' : {
					swipeleft : _nextPage,
					swiperight : _prevPage
				},
				'.prevPage' : {tap : _prevPage},
				'.nextPage' : {tap : _nextPage},
				'.item' : {
					tap : function (isReload) {
						var obj = arguments[arguments.length - 1],
							$old = obj.$currentTarget.siblings('.selected');

						obj.$oldSlide = $old;
						obj.isSame = obj.$currentTarget.is($old);
						obj.isReload = isReload;

						obj.Ctrl.eventBroadcast('SelectSlide', obj);
					}
				},
				'.item:first-of-type' : {
					'transitionend' : function (ev) {
						var obj = arguments[arguments.length - 1],
							transSelect = '.' + animationClass + ' ' + ev.handleObj.selector;

						if (obj.$currentTarget.is(transSelect)) {
							obj.Ctrl.eventBroadcast('TransitionEnd', obj);
						}
					}
				}
			},
			_defaultConfig : {
				mobile : {
					'pagination' : {
						'wrap' : 1
					}
				}
			},
			'__init' : function () {
				sliderDebug(this._ctrlName + ' init');

				var htmlStr = '',
					$sliderStrip = this.$root;

				this._pageIndex = 0;
				this._maxViewable = 1;
				this._marginOffset = 0;
				this._marginPercentage = 10;
				this._totalMargin = 0;
				this._maxPages = 1;
				this._itemRemainder = 0;
				this._percentWidth = 0;
				this._currentMargin = 0;
				this._sliderDisable = false;

				this.$slideTrack = $sliderStrip.find('.slideTrack');
				this.$trackWrap = $();
				this.$slideNext = $();
				this.$slidePrev = $();
				this.$slidePager = $();
				this.$slideNum = $();
				this.$slideOf = $();

				if (!this.$slideTrack.length) {

					if (this._bpConfig && this._bpConfig.carousel) {
						this.$slideTrack = $sliderStrip.find(this._bpConfig.carousel);
					}

					if (!this.$slideTrack.length) {
						//TODO: use more general find
						this.$slideTrack = $sliderStrip.find('.item').eq(0).parent();
					}

					this.$slideTrack.addClass('slideTrack');

					sliderDebug(['slideTrack', this.$slideTrack]);
				}

				this.$trackWrap = this.$slideTrack.parent('.trackWrap');

				if (!this.$trackWrap.length) {
					htmlStr = '<div class="trackWrap"/>';
					this.$trackWrap = this.$slideTrack.wrap(htmlStr).parent();
				}
			},
			'__postInit' : function () {
				var $selected = this.$slideTrack.children('.selected');

				this._updateValues();

				if ($selected.length > 0) {
					this.directionToPage(Math.floor($selected.index() / this._maxViewable), false);
				} else {
					this._updateInteractions();
				}
			},
			'configure' : function () {
				var $sliderStrip = this.$root,
					htmlStr,
					$temp;

				//TODO: breakpoint init
				if ($.type(this._bpConfig.pagination) === 'object') {

					if ($.type(this._bpConfig.pagination.numPager) === 'object') {
						htmlStr = '<span class="slidePage"/>';
						$temp = $();
						//TODO: filter what action "e" is

						$.each(this._bpConfig.pagination.numPager, function (i, e) {
							var temp = $sliderStrip.find(i);

							if (temp.length && temp[e]) {
								$temp = $temp.add(
									$(htmlStr)[e](temp)
								);
								sliderDebug(i, e, $temp);
							}

						});

						this.$slidePager = this.$slidePager.add($temp);
						sliderDebug(this.$slidePager);
					}

					if (this._bpConfig.pagination.wrap === 1) {
						htmlStr = '<a class="prevPage" href="#prev"/>';
						$temp = $(htmlStr).insertBefore(this.$slideTrack);
						this.$slidePrev = this.$slidePrev.add($temp);

						htmlStr = '<a class="nextPage" href="#next"/>';
						$temp = $(htmlStr).insertAfter(this.$slideTrack);
						this.$slideNext = this.$slideNext.add($temp);
					}
				}
			},
			'_onDisabled' : function () {
				if (this.$slideTrack instanceof $){
					this.$slideTrack.eq(0).children(childrenCriteria).get(0).style.marginLeft = null;
				}
			},
			'_onEnabled': function () {
				this.directionToPage(this._pageIndex, false, true);
			},
			'directionToPage' : function (direction, useAnim, force) {
				sliderDebug('Direction to go:' + direction);
				var pageOffset = direction;

				if (/^(prev|next)$/i.test(direction)) {

					pageOffset = this._pageIndex + 1;

					if (direction === 'prev') {
						pageOffset = this._pageIndex - 1;
					}
				}

				pageOffset = parseInt(pageOffset, 10);
				sliderDebug('New offset is ' + pageOffset);
				if (isNaN(pageOffset)) {
					return false; // no change will occur
				}

				if (pageOffset < 0) {

					if (Math.abs(pageOffset) > this._maxPages) {
						pageOffset = -this._maxPages;
					} else{
						pageOffset = this._maxPages + pageOffset;
					}

				} else if (pageOffset >= this._maxPages) {

					pageOffset = this._maxPages - 1;
				}

				sliderDebug('Corrected offset is ' + pageOffset);
				if (pageOffset === this._pageIndex && !force) {
					this._updateInteractions();
					return false;
				}

				_updatePos.apply(this, [pageOffset, useAnim]);
				return true;
			},
			'resetTrack' : function () {
				this.directionToPage(0, false);
				this.updateTrack();
			},
			_updateInteractions : function () {
				_updateNextPrev.apply(this);
				_updateIndexPos.apply(this);
			},
			_updateValues : function () {
				var $track = this.$slideTrack.eq(0),
	//				trackClass = this.$sliderStrip.attr('class'),
					$items = $track.children(childrenCriteria),
					$firstItem = $items.eq(0);

				if ($items.length <= 1) {
					this._maxViewable = 1;
					this._maxPages = 1;
					this._marginPercentage = 1;
					this._childWidth = $firstItem.outerWidth(true);
					return true;
				}

				this._childWidth = $items.eq(1).outerWidth(true);
				this._marginPercentage = Math.round(this.$slideTrack.width() / this.$trackWrap.first().width());

				sliderDebug('child width ' + this._childWidth);

				/* Calc how many slides the viewport can handle */
				this._maxViewable = this.$trackWrap.width() / this._childWidth;
				sliderDebug('max viewable before fixed ' + this._maxViewable);
				//How close is this to the highest whole number;
				if (+this._maxViewable.toFixed(0) > this._maxViewable && !this._bpConfig.fitTrack) {
					this._maxViewable = Math.ceil(this._maxViewable);
				} else {
					this._maxViewable = Math.floor(this._maxViewable);
				}
				sliderDebug('max viewable ' + this._maxViewable);

				this._maxPages = Math.ceil($items.length / this._maxViewable);
				sliderDebug('max pages ' + this._maxPages);

				//The maximum margin the slider can support
				this._totalMargin = - (($items.length - this._maxViewable) * this._childWidth);
				sliderDebug('total margin ' + this._totalMargin);

				//Used for fitTrack config. Slider track is resized make the
				//remaining viewable slides look correct in the view port
				this._maxWidth = this._maxViewable * this._childWidth;

				this._itemRemainder = (this._maxViewable * this._maxPages) - $items.length;
				this._percentWidth = (this._childWidth / this._maxWidth) * this._marginPercentage;

				if (this._bpConfig.fitTrack && !this._bpConfig.isNotAutoCentering) {
					this.$slideTrack.css('max-width', this._maxWidth);
				}

				/* Not used yet
				this._marginPercentage = ((this._maxViewable * $firstItem.width())
					/ $track.outerWidth(true)).toFixed(4) * 1;

				sliderDebug('max percentage ' + this._marginPercentage);
				*/

				// Find margin offset
				/* currently not used.
				this._marginOffset = parseFloat($firstItem.css('marginRight'));
				this._marginOffset /= $track.width();
				this._marginOffset *= 100;
				this._marginOffset = parseFloat(this._marginOffset.toFixed(4));

				sliderDebug('margin offset ' + this._marginOffset);
				*/
			},
			updateTrack : function () {
				var oldMaxPages = this._maxPages,
					usePageIndex,
					pageIndex;

				if (!this.$root.hasClass(this._ctrlName)) {
					return false;
				}

				if (this._updateValues()) {
					return true;
				}

				if (oldMaxPages !== this._maxPages) {
					_createPageIndices.apply(this, [this._maxPages]);
				}

				sliderDebug('current margin', this._currentMargin);

				pageIndex = -this._currentMargin / (this._childWidth * this._maxViewable);
				pageIndex = +pageIndex.toFixed(0);

				usePageIndex = this._pageIndex;

				if (this._pageIndex !== pageIndex) {
					usePageIndex = pageIndex;
				} else if (
					(this._pageIndex + 1) >= this._maxPages ||
					this._currentMargin <= this._totalMargin
				) {
					usePageIndex = this._maxPages - 1;
				}

				this.directionToPage(usePageIndex, false);

				return true;
			},
			'setDisabled' : function (disable) {
				this._sliderDisable = !!disable;
			},
			'isDisabled' : function () {
				return this._sliderDisable;
			}
		},
		//static
		{
			'_eventBroadcast' : {
				'Sliding' : [
					{
						'tag' : 'defaultSlideAction',
						'timing' : 1,
						'sub': function (obj) {
							obj.Ctrl.directionToPage(obj.num);
						}
					}
				],
				'SelectSlide' : [
					{
						'tag' : 'selecting',
						'timing' : 0,
						'sub': function (obj) {
							if (!obj.isSame) {
								obj.$oldSlide.removeClass('selected');
								obj.$currentTarget.addClass('selected');
							}
						}
					}
				],
				'TransitionEnd' : [
					{
						'timing' : 1,
						'sub': function (obj) {
							obj.$delegateTarget.removeClass(animationClass);
						}
					}
				]
			}
		}
	);

	SliderStrip.init('.sliderStrip');

	$(document).ready(function () {

        EPB('windowResize', {
			'tag' : 'adjustSliderStrip',
			'sub' : _adjustSliderStrip
		});
	});

    return SliderStrip;
}(Ctrl, jQuery, EventPriorityBroadcaster));
