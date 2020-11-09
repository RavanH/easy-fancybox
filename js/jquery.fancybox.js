/*
* FancyBox Classic - jQuery Plugin
* Simple but fancy lightbox, based on the original FancyBox by Janis Skarnelis, modernized.
*
* Examples and original documentation at: http://fancybox.net
*
* Copyright (c) 2008 - 2010 Janis Skarnelis
* That said, it is hardly a one-person project. Many people have submitted bugs, code, and offered their advice freely. Their support is greatly appreciated.
*
* Copyright (c) 2020 - RavanH
* Version: 1.5 (2020/11/09)
* Requires: jQuery v1.7+
*
* Licensed GPLv3
*/
(function($) {
	var tmp, loading, overlay, wrap, outer, content, close, title, nav_prev, nav_next, resize_timeout,
	selectedIndex = 0, selectedOpts = {}, selectedArray = [], currentIndex = 0, currentOpts = {}, currentArray = [],
	ajaxLoader = null, imgPreloader = new Image(),
	imgRegExp = /\.(jpg|gif|png|bmp|jpeg|webp)(.*)?$/i, swfRegExp = /[^\.]\.(swf)\s*$/i, svgRegExp = /[^\.]\.(svg)\s*$/i, pdfRegExp = /[^\.]\.(pdf)\s*$/i,
	titleHeight = 0, titleStr = '', final_pos, busy = false,
	swipe_busy = false, swipe_startX, pixel_ratio = window.devicePixelRatio || 1,
	isTouch = 'ontouchstart' in window || window.DocumentTouch && document instanceof DocumentTouch || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

	/*
	* Private methods
	*/

	_abort = function() {
		$.fancybox.hideActivity();

		imgPreloader.onerror = imgPreloader.onload = null;

		if (ajaxLoader) {
			ajaxLoader.abort();
		}

		tmp.empty();
	},

	_error = function(msg) {
		if (false === selectedOpts.onError(selectedArray, selectedIndex, selectedOpts)) {
			$.fancybox.hideActivity();
			busy = false;
			return;
		}

		if ( typeof msg === 'undefined' ) {
			msg = 'Please try again later.';
		}

		selectedOpts.titleShow = false;

		selectedOpts.width = 'auto';
		selectedOpts.height = 'auto';

		tmp.html( '<p id="fancybox-error">The requested content cannot be loaded.<br />' + msg + '</p>' );

		_process_inline();
	},

	_start = function() {
		var obj = selectedArray[ selectedIndex ],
			href, type, title, ret;

		_abort();

		selectedOpts = $.extend({}, $.fn.fancybox.defaults, (typeof $(obj).data('fancybox') == 'undefined' ? selectedOpts : $(obj).data('fancybox')));

		if ( document.documentElement.clientWidth < selectedOpts.minViewportWidth ) {
			busy = false;
			return;
		}

		if ('object' === typeof arguments[0] && 'click' === arguments[0].type) {
			arguments[0].preventDefault();
		}

		$(document).trigger('fancybox-start', selectedArray, selectedIndex, selectedOpts);

		ret = selectedOpts.onStart(selectedArray, selectedIndex, selectedOpts);

		if (ret === false) {
			busy = false;
			return;
		} else if (typeof ret == 'object') {
			selectedOpts = $.extend(selectedOpts, ret);
		}

		title = selectedOpts.title || (obj.nodeName ? $(obj).attr('title') : obj.title) || '';

		if (obj.nodeName && !selectedOpts.orig) {
			selectedOpts.orig = $(obj).find("img:first").length ? $(obj).find("img:first") : $(obj);
		}

		if (title === '' && selectedOpts.orig) {
			title = selectedOpts.orig.attr('title') || (selectedOpts.titleFromAlt ? selectedOpts.orig.attr('alt') : '');
		}

		href = selectedOpts.href || (obj.nodeName ? $(obj).attr('href') : obj.href) || null;

		if ((/^(?:javascript)/i).test(href) || href == '#') {
			href = null;
		}

		if (selectedOpts.type) {
			type = selectedOpts.type;

			if (!href) {
				href = selectedOpts.content;
			}

		} else if (selectedOpts.content) {
			type = 'html';

		} else if ( $(obj).hasClass('iframe') ) {
			type = 'iframe';

		} else if (href) {
			if (href.match(imgRegExp) || $(obj).hasClass("image")) {
				type = 'image';

			} else if (href.match(swfRegExp)) {
				type = 'swf';

			} else if (href.match(svgRegExp)) {
				type = 'svg';

			} else if (href.match(pdfRegExp)) {
				type = 'pdf';

			} else if (href.indexOf("#") === 0) {
				type = 'inline';

			} else {
				type = 'ajax';
			}
		}

		if (!type) {
			_error('No content type found.');
			return;
		}

		if ($(obj).hasClass('modal')) {
			selectedOpts.modal = true;
		}

		if (type == 'inline') {
			obj	= href.substr(href.indexOf("#"));
			type = $(obj).length > 0 ? 'inline' : 'ajax';
		}

		selectedOpts.type = type;
		selectedOpts.href = href;
		selectedOpts.title = title;

		if (selectedOpts.autoDimensions) {
			if (selectedOpts.type == 'html' || selectedOpts.type == 'inline' || selectedOpts.type == 'ajax') {
				selectedOpts.width = 'auto';
				selectedOpts.height = 'auto';
			} else {
				selectedOpts.autoDimensions = false;
			}
		}

		if (selectedOpts.modal) {
			selectedOpts.overlayShow = true;
			selectedOpts.hideOnOverlayClick = false;
			selectedOpts.hideOnContentClick = false;
			selectedOpts.enableEscapeButton = false;
			selectedOpts.showCloseButton = false;
		}

		selectedOpts.padding = parseInt(selectedOpts.padding, 10);
		selectedOpts.margin = parseInt(selectedOpts.margin, 10);

		tmp.css('padding', (selectedOpts.padding + selectedOpts.margin));

		$('.fancybox-inline-tmp').off('fancybox-cancel').on('fancybox-change', function() {
			$(this).replaceWith(content.children());
		});

		switch (type) {
			case 'html' :
				tmp.html( selectedOpts.content );
				selectedOpts.enableKeyboardNav = false;
				selectedOpts.enableSwipeNav = false;
				selectedOpts.showNavArrows = false;
				_process_inline();
			break;

			case 'inline' :
				if ( $(obj).parent().is('#fancybox-content') === true) {
					busy = false;
					return;
				}

				selectedOpts.enableKeyboardNav = false;
				selectedOpts.enableSwipeNav = false;
				selectedOpts.showNavArrows = false;

				$('<div class="fancybox-inline-tmp" />')
				.hide()
				.insertBefore( $(obj) )
				.on('fancybox-cleanup', function() {
					$(this).replaceWith(content.find(obj));
				}).on('fancybox-cancel', function() {
					$(this).replaceWith(tmp.find(obj));
				});

				$(obj).appendTo(tmp);

				_process_inline();
			break;

			case 'image':
				selectedOpts.keepRatio = true;

				busy = false;

				$.fancybox.showActivity();

				imgPreloader = new Image();

				imgPreloader.onerror = function() {
					_error('No image found.');
				};

				imgPreloader.onload = function() {
					busy = true;

					imgPreloader.onerror = imgPreloader.onload = null;

					_process_image();
				};

				imgPreloader.src = href;
			break;

			case 'swf':
				selectedOpts.scrolling = 'no';
				selectedOpts.keepRatio = true;

				var emb = '', str = '<object type="application/x-shockwave-flash" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="' + selectedOpts.width + '" height="' + selectedOpts.height + '"><param name="movie" value="' + href + '"></param>';

				$.each(selectedOpts.swf, function(name, val) {
					str += '<param name="' + name + '" value="' + val + '"></param>';
					emb += ' ' + name + '="' + val + '"';
				});

				str += '<embed src="' + href + '" type="application/x-shockwave-flash" width="' + selectedOpts.width + '" height="' + selectedOpts.height + '"' + emb + '></embed></object>';

				tmp.html(str);

				_process_inline();
			break;

			case 'svg':
				selectedOpts.scrolling = 'no';
				selectedOpts.keepRatio = true;

				var str = '<object type="image/svg+xml" width="' + selectedOpts.width + '" height="' + selectedOpts.height + '" data="' + href + '"></object>';

				tmp.html(str);

				_process_inline();
			break;

			case 'pdf':
				selectedOpts.scrolling = 'no';
				selectedOpts.enableKeyboardNav = false;
				selectedOpts.enableSwipeNav = false;
				selectedOpts.showNavArrows = false;

				var str = '<object type="application/pdf" width="100%" height="100%" data="' + href + '"><a href="' + href + '" style="display:block;position:absolute;top:48%;width:100%;text-align:center">' + $(obj).html() + '</a></object>';

				tmp.html(str);

				_process_inline();
			break;

			case 'ajax':
				busy = false;

				$.fancybox.showActivity();

				selectedOpts.ajax.win = selectedOpts.ajax.success;

				ajaxLoader = $.ajax($.extend({}, selectedOpts.ajax, {
					url	: href,
					data : selectedOpts.ajax.data || {},
					error : function() {
						if ( arguments[0].status > 0 ) { // XMLHttpRequest
							_error(arguments[2]); // errorThrown
						}
					},
					success : function(data, textStatus, XMLHttpRequest) {
						var o = typeof XMLHttpRequest == 'object' ? XMLHttpRequest : ajaxLoader;
						if (o.status == 200) {
							if ( typeof selectedOpts.ajax.win == 'function' ) {
								ret = selectedOpts.ajax.win(href, data, textStatus, XMLHttpRequest);

								if (ret === false) {
									$.fancybox.hideActivity();
									return;
								} else if (typeof ret == 'string' || typeof ret == 'object') {
									data = ret;
								}
							}

							if ( data.indexOf("<!DOCTYPE") > -1 || data.indexOf("<html") > -1 || data.indexOf("<body") > -1 ) {
								_error('Unexpected response.');
							} else {
								tmp.html( data );
								_process_inline();
							}
						}
					}
				}));
			break;

			case 'iframe':
				selectedOpts.enableKeyboardNav = false;
				selectedOpts.enableSwipeNav = false;
				selectedOpts.showNavArrows = false;

				$.fancybox.showActivity();

				_show();
			break;
		}
	},

	_process_inline = function() {
		var w = selectedOpts.width,
			h = selectedOpts.height;

		if (w.toString().indexOf('%') > -1) {
			w = parseInt((window.innerWidth - (selectedOpts.margin * 2)) * parseFloat(w) / 100, 10) + 'px';
		} else {
			w = w == 'auto' ? 'auto' : w + 'px';
		}

		if (h.toString().indexOf('%') > -1) {
			h = parseInt((window.innerHeight - (selectedOpts.margin * 2)) * parseFloat(h) / 100, 10) + 'px';
		} else {
			h = h == 'auto' ? 'auto' : h + 'px';
		}

		tmp.wrapInner('<div style="width:' + w + ';height:' + h + ';overflow:' + (selectedOpts.scrolling == 'auto' ? 'auto' : (selectedOpts.scrolling == 'yes' ? 'scroll' : 'hidden')) + ';position:relative;"></div>');

		selectedOpts.width = tmp.width();
		selectedOpts.height = tmp.height();

		_show();
	},

	_process_image = function() {
		selectedOpts.width = imgPreloader.width;
		selectedOpts.height = imgPreloader.height;

		$("<img />").attr({
			'id' : 'fancybox-img',
			'src' : imgPreloader.src,
			'alt' : selectedOpts.title
		}).appendTo( tmp );

		_show();
	},

	_show = function() {

		if (selectedOpts.type !== 'iframe') {
			$.fancybox.hideActivity();
		}

		if (wrap.is(":visible") && false === currentOpts.onCleanup(currentArray, currentIndex, currentOpts)) {
			$.event.trigger('fancybox-cancel');

			busy = false;
			return;
		}

		busy = true;

		$('html').addClass('fancybox-active');

		$(content.add( overlay )).off();

		$(window).off("orientationchange.fb resize.fb scroll.fb");
		$(document).off('keydown.fb');

		var oldType = currentOpts.type;

		currentArray = selectedArray;
		currentIndex = selectedIndex;
		currentOpts = selectedOpts;

		if (currentOpts.overlayShow) {
			if (currentOpts.overlayColor)
				overlay.css('background-color',currentOpts.overlayColor);

			if (currentOpts.hideOnOverlayClick)
				overlay.css('cursor','pointer');

			if (!overlay.is(':visible')) {
				overlay.fadeIn('fast');
			}
		} else {
			overlay.hide();
		}

		_process_title();

		final_pos = _get_zoom_to();

		if (wrap.is(":visible")) {
			$( close.add( nav_prev ).add( nav_next ) ).hide();

			$.event.trigger('fancybox-change');

			// if both images
			if (oldType === 'image' && currentOpts.type === 'image') {
				// crossfade
				content.prepend( tmp.contents() );
				content
					.children()
					.first()
					.next()
					.fadeOut(currentOpts.changeFade, function(){ $( this ).remove(); } );

					content.css('border-width', currentOpts.padding);

					wrap.animate(final_pos, {
						duration : currentOpts.changeSpeed,
						easing : currentOpts.easingChange,
						complete : _finish
					});
			} else {
				content.fadeTo(currentOpts.changeFade, 0.3, function() {

					content.css('border-width', currentOpts.padding);

					wrap.animate(final_pos, {
						duration : currentOpts.changeSpeed,
						easing : currentOpts.easingChange,
						complete : function() {
							content.html( tmp.contents() ).fadeTo(currentOpts.changeFade, 1, _finish);
						}
					});
				});
			}

			return;
		}

		wrap.removeAttr("style");

		content.css('border-width', currentOpts.padding);

		content.html( tmp.contents() );

		if (currentOpts.transitionIn == 'elastic') {
			wrap.css(_get_orig_pos()).show();

			final_pos.opacity = 1;

			wrap
				.attr('aria-hidden','false')
				.animate(final_pos, {
					duration : currentOpts.speedIn,
					easing : currentOpts.easingIn,
					complete : _finish
				});
		} else {
			wrap
				.css(final_pos)
				.attr('aria-hidden','false')
				.fadeIn( currentOpts.transitionIn == 'none' ? 0 : currentOpts.speedIn, _finish );
		}
	},

	_format_title = function(title) {
		if (title && title.length) {
			return '<div id="fancybox-title">' + title + '</div>';
		}

		return false;
	},

	_process_title = function() {
		titleStr = currentOpts.title || '';

		title
			.empty()
			.removeAttr('style')
			.removeClass();

		if (currentOpts.titleShow === false) {
			title.hide();
			return;
		}

		titleStr = $.isFunction(currentOpts.titleFormat) ? currentOpts.titleFormat(titleStr, currentArray, currentIndex, currentOpts) : _format_title(titleStr);

		if (!titleStr || titleStr === '') {
			title.hide();
			return;
		}

		title
			.addClass('fancybox-title-' + currentOpts.titlePosition)
			.html( titleStr )
			.appendTo( 'body' )
			.show();

		switch (currentOpts.titlePosition) {
			case 'outside':
			case 'inside':
				titleHeight = title.outerHeight(true);
				// don't break here

			case 'inside':
			case 'over':
				if (content.is(":visible")) {
					title.appendTo( content );
				} else {
					title.appendTo( tmp );
				}
			break;

			default:
				title
					.css({
						'paddingLeft' : currentOpts.padding,
						'paddingRight' : currentOpts.padding
					})
					.appendTo( wrap );
		}

		title.hide();
	},

	_set_navigation = function() {

		if ( currentArray.length == 1 ) return;

		if (isTouch && currentOpts.enableSwipeNav) {
			wrap.on("touchstart.fb", function(e){
				swipe_startX = typeof e.touches !== 'undefined' ? e.touches[0].clientX : e.originalEvent.touches[0].clientX;
				swipe_busy = true;
				wrap.on("touchmove.fb",_swipe);
			});
			wrap.on("touchend.fb", function(){
				wrap.off("touchmove.fb");
				swipe_busy = false;
			});
		}

		if ($.fn.mousewheel) {
			wrap.on('mousewheel.fb', function(e, delta) {
				if (busy) {
					e.preventDefault();
				} else if ( currentOpts.type == 'image' && ( $(e.target).outerHeight() == 0 || $(e.target).prop('scrollHeight') === $(e.target).outerHeight() ) ) {
					e.preventDefault();
					$.fancybox[ delta > 0 ? 'prev' : 'next' ]();
				}
			});
		}

		if (currentOpts.enableEscapeButton || currentOpts.enableKeyboardNav) {
			$(document).on('keydown.fb', function(e) {
				if (e.keyCode == 27 && currentOpts.enableEscapeButton) {
					e.preventDefault();
					$.fancybox.close();
				} else if ((e.keyCode == 37 || e.keyCode == 39) && currentOpts.enableKeyboardNav && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
					e.preventDefault();
					$.fancybox[ e.keyCode == 37 ? 'prev' : 'next']();
				} else if ((e.keyCode == 9) && currentOpts.enableKeyboardNav && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
					e.preventDefault();
					$.fancybox[ e.shiftKey ? 'prev' : 'next']();
				}
			});
		}

		if (!currentOpts.showNavArrows) {
			return;
		}

		if (currentOpts.cyclic || currentIndex !== 0) {
			nav_prev.show();
		}

		if (currentOpts.cyclic || currentIndex != currentArray.length-1) {
			nav_next.show();
		}
	},

	_finish = function () {
		if (titleStr && titleStr.length) {
			title.show();
		}

		if (currentOpts.showCloseButton) {
			close.show();
		}

		_set_navigation();

		if (currentOpts.hideOnContentClick)	{
			content.on('click', $.fancybox.close);
		}

		if (currentOpts.hideOnOverlayClick)	{
			overlay.on('click', $.fancybox.close);
		}

		if (currentOpts.autoResize) {
			$(window).on("resize.fb", $.fancybox.resize);
		}

		if (currentOpts.type == 'iframe') {
			$('<iframe id="fancybox-frame" name="fancybox-frame' + new Date().getTime() + '"'
			+ ' style="border:0;margin:0;overflow:' + (currentOpts.scrolling == 'auto' ? 'auto' : (currentOpts.scrolling == 'yes' ? 'scroll' : 'hidden')) + '" src="'
			+ currentOpts.href + '"' + (false === currentOpts.allowfullscreen ? '' : ' allowfullscreen') + ' allow="autoplay; encrypted-media" tabindex="999"></iframe>')
			.appendTo(content).on('load',function() {
				$.fancybox.hideActivity();
			});
		}

		wrap.show().focus();

		busy = false;

		$(document).trigger('fancybox-complete', currentArray, currentIndex, currentOpts);

		currentOpts.onComplete(currentArray, currentIndex, currentOpts);

		if (currentArray.length > 1) {
			_preload_next();
			_preload_prev();
		}
	},

	_preload_next = function() {
		var pos = typeof arguments[0] == 'number' ? arguments[0] : currentIndex + 1;

		if ( pos >= currentArray.length ) {
			if (currentOpts.cyclic) {
				pos = 0;
			} else {
				return;
			}
		}

		if ( pos == currentIndex ) {
			currentOpts.enableKeyboardNav = false;
			currentOpts.enableSwipeNav = false;
			wrap.off('mousewheel.fb touchstart.fb');
			nav_next.hide();
			return;
		}

		if ( _preload_image( pos ) ) {
			return;
		} else {
			_preload_next( pos + 1 );
		}
	},

	_preload_prev = function() {
		var pos = typeof arguments[0] == 'number' ? arguments[0] : currentIndex - 1;

		if ( pos < 0 ) {
			if (currentOpts.cyclic) {
				pos = currentArray.length - 1;
			} else {
				return;
			}
		}

		if ( pos == currentIndex ) {
			currentOpts.enableKeyboardNav = false;
			currentOpts.enableSwipeNav = false;
			wrap.off('mousewheel.fb touchstart.fb');
			nav_prev.hide();
			return;
		}

		if ( _preload_image( pos ) ) {
			return;
		} else {
			_preload_prev( pos - 1 );
		}
	},

	_preload_image = function(pos) {
		var objNext, obj = currentArray[ pos ];

		if ( typeof obj !== 'undefined' && typeof obj.href !== 'undefined' &&  obj.href !== currentOpts.href && (obj.href.match(imgRegExp) || $(obj).hasClass("image")) ) {
			objNext = new Image();
			objNext.src = obj.href;
			return true;
		} else {
			return false;
		}
	},

	_get_zoom_to = function () {
		var view = [
				window.innerWidth - (currentOpts.margin * 2),
				window.innerHeight - (currentOpts.margin * 2),
				$(document).scrollLeft() + currentOpts.margin,
				$(document).scrollTop() + currentOpts.margin
			],
			to = {},
			border = currentOpts.padding * 2,
			ratio = currentOpts.keepRatio ? currentOpts.width / currentOpts.height : 1;

		if (currentOpts.width.toString().indexOf('%') > -1) {
			to.width = parseInt((view[0] * parseFloat(currentOpts.width)) / 100, 10);
		} else {
			to.width = currentOpts.width;
		}

		if (currentOpts.height.toString().indexOf('%') > -1) {
			to.height = parseInt((view[1] * parseFloat(currentOpts.height)) / 100 + titleHeight, 10);
		} else {
			to.height = currentOpts.height;
		}

		// scale down to fit viewport, recalculate by ratio based on width and height without border and title
		if (currentOpts.autoScale && to.width > view[0] - border) {
			to.width = view[0] - border;
			to.height = parseInt(to.width / ratio, 10);
		}
		if (currentOpts.autoScale && to.height > view[1] - border - titleHeight) {
			to.height = view[1] - border - titleHeight;
			to.width = parseInt(to.height * ratio, 10);
		}

		// adjust final height and width for padding and title
		to.width += border;
		to.height += border + titleHeight;

		// calculate position
		to.left = parseInt(Math.max(view[2], view[2] + ((view[0] - to.width) / 2)), 10);
		to.top = parseInt(Math.max(view[3], view[3] + ((view[1] - to.height) / 2)), 10);

		return to;
	},

	_get_orig_pos = function() {
		if ( !selectedOpts.orig ) return false;

		var orig = $(selectedOpts.orig);

		if ( !orig.length ) return false;

		var pos = orig.offset();

		pos.top += parseInt( orig.css('paddingTop'), 10 ) || parseInt( orig.css('border-top-width'), 10 ) || 0;
		pos.left += parseInt( orig.css('paddingLeft'), 10 ) || parseInt( orig.css('border-left-width'), 10 ) || 0;

		return {
			width : orig.width() + (currentOpts.padding * 2),
			height : orig.height() + (currentOpts.padding * 2),
			top : pos.top - currentOpts.padding,
			left : pos.left - currentOpts.padding,
			opacity : 0
		};
	},

	_swipe = function(e) {
		if (swipe_busy) {
			var x = typeof e.touches !== 'undefined' ? e.touches[0].clientX : e.originalEvent.touches[0].clientX;
			var dx = swipe_startX - x;
			if(Math.abs(dx) * pixel_ratio >= currentOpts.swipeThreshold) {
				wrap.off("touchmove.fb");
				if ( dx < 0 ) $.fancybox.prev();
				else $.fancybox.next();
			}
		};
	};

	_cleanup = function() {
		overlay.fadeOut('fast');

		title.empty().hide();
		wrap.hide();

		$.event.trigger('fancybox-cleanup');

		content.empty();

		$(document).trigger('fancybox-closed', currentArray, currentIndex, currentOpts );

		currentOpts.onClosed(currentArray, currentIndex, currentOpts);

		currentArray = selectedOpts	= [];
		currentIndex = selectedIndex = 0;
		currentOpts = selectedOpts	= {};

		$('html').removeClass('fancybox-active');

		busy = false;
	}

	/*
	* Public methods
	*/

	$.fn.fancybox = function(options) {
		if (!$(this).length) {
			return this;
		}

		$(this)
		.data('fancybox', $.extend({}, options, ($.metadata ? $(this).metadata() : {})))
		.attr({'aria-controls':'fancybox','aria-haspopup':'dialog'})
		.off('click.fb')
		.on('click.fb', function(e) {
			if (busy) {
				return;
			}

			busy = true;

			$(this).blur();

			selectedArray = [];
			selectedIndex = 0;

			var rel = $(this).attr('rel') || '';

			if (rel == '' || rel.replace(/alternate|external|help|license|nofollow|noreferrer|noopener|\s+/gi,'') == '') {
				selectedArray.push(this);
			} else {
				selectedArray = $('a[rel="' + rel + '"], area[rel="' + rel + '"]');
				selectedIndex = selectedArray.index( this );
			}

			_start(e);

			return;
		});

		return this;
	};

	$.fancybox = function(obj) {
		var opts;

		if (busy) {
			return;
		}

		busy = true;
		opts = typeof arguments[1] !== 'undefined' ? arguments[1] : {};

		selectedArray = [];
		selectedIndex = parseInt(opts.index, 10) || 0;

		if ( $.isArray(obj) ) {
			for (var i = 0, j = obj.length; i < j; i++) {
				if (typeof obj[i] == 'object') {
					$(obj[i]).data('fancybox', $.extend({}, opts, obj[i]));
				} else {
					obj[i] = $({}).data('fancybox', $.extend({content : obj[i]}, opts));
				}
			}

			selectedArray = jQuery.merge(selectedArray, obj);

		} else {
			if ( typeof obj == 'object' ) {
				$(obj).data('fancybox', $.extend({}, opts, obj));
			} else {
				obj = $({}).data('fancybox', $.extend({content : obj}, opts));
			}

			selectedArray.push(obj);
		}

		if (selectedIndex > selectedArray.length || selectedIndex < 0) {
			selectedIndex = 0;
		}

		_start();
	};

	$.fancybox.showActivity = function() {
		loading.show();
	};

	$.fancybox.hideActivity = function() {
		loading.hide();
	};

	$.fancybox.next = function() {
		var obj, pos = typeof arguments[0] == 'number' ? arguments[0] : currentIndex + 1;

		if (pos >= currentArray.length) {
			if (currentOpts.cyclic) {
				pos = 0;
			} else {
				return;
			}
		}

		obj = currentArray[pos];

		if ( pos != currentIndex && typeof obj !== 'undefined' && typeof obj.href !== 'undefined' && obj.href === currentOpts.href ) {
			$.fancybox.next( pos + 1 );
		} else {
			$.fancybox.pos( pos );
		}

		return;
	};

	$.fancybox.prev = function() {
		var obj, pos = typeof arguments[0] == 'number' ? arguments[0] : currentIndex - 1;

		if (pos < 0) {
			if (currentOpts.cyclic) {
				pos = currentArray.length - 1;
			} else {
				return;
			}
		}

		obj = currentArray[pos];

		if ( pos != currentIndex && typeof obj !== 'undefined' && typeof obj.href !== 'undefined' && obj.href === currentOpts.href ) {
			$.fancybox.prev( pos - 1 );
		} else {
			$.fancybox.pos( pos );
		}

		return;
	};

	$.fancybox.pos = function(pos) {
		if (busy) {
			return;
		}

		pos = parseInt(pos);

		if (currentArray.length > 1 && pos != currentIndex && pos > -1 && pos < currentArray.length) {
			selectedArray = currentArray;
			selectedIndex = pos;
			_start();
		}

		return;
	};

	$.fancybox.cancel = function() {
		if (busy) {
			return;
		}

		busy = true;

		_abort();

		$(document).trigger('fancybox-cancel', selectedArray, selectedIndex, selectedOpts);

		selectedOpts.onCancel(selectedArray, selectedIndex, selectedOpts);

		busy = false;
	};

	// Note: within an iframe use - parent.$.fancybox.close();
	$.fancybox.close = function() {
		if (busy || wrap.is(':hidden')) {
			return;
		}

		busy = true;

		$(document).trigger('fancybox-cleanup', currentArray, currentIndex, currentOpts);

		if (currentOpts && false === currentOpts.onCleanup(currentArray, currentIndex, currentOpts)) {
			busy = false;
			return;
		}

		_abort();

		$(close.add( nav_prev ).add( nav_next )).hide();

		$(content.add( overlay )).off();

		$(window).off("orientationchange.fb resize.fb scroll.fb");
		$(wrap).off("mousewheel.fb touchstart.fb touchmove.fb touchend.fb");
		$(document).off('keydown.fb');

		if (currentOpts.titlePosition !== 'inside') {
			title.empty();
		}

		wrap.stop();

		if (currentOpts.transitionOut == 'elastic') {
			title.empty().hide();

			wrap
			.animate(_get_orig_pos(), {
				duration : currentOpts.speedOut,
				easing : currentOpts.easingOut,
				complete : _cleanup
			})
			.attr('aria-hidden','true');

		} else {
			wrap
			.fadeOut( currentOpts.transitionOut == 'none' ? 0 : currentOpts.speedOut, _cleanup)
			.attr('aria-hidden','true');
		}
	};

	$.fancybox.resize = function() {
		clearTimeout( resize_timeout );

		resize_timeout = setTimeout( function() {
			var restore = [];

			busy = true;

			_process_title();

			final_pos = _get_zoom_to();

			close.is(":visible") && restore.push(close) && close.hide();
			nav_prev.is(":visible") && restore.push(nav_prev) && nav_prev.hide();
			nav_next.is(":visible") && restore.push(nav_next) && nav_next.hide();

			wrap.animate(final_pos, {
				duration : currentOpts.changeSpeed,
				easing : currentOpts.easingChange,
				complete : function() {
					if (titleStr && titleStr.length) {
						title.show();
					}
					restore.forEach( el => el.show() );
					busy = false;
				}
			});
		}, 500 );
	};

	$.fancybox.init = function() {
		if ($("#fancybox").length) {
			return;
		}

		$('body').append(
			tmp = $('<div id="fancybox-tmp"></div>'),
			loading = $('<div id="fancybox-loading"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>'),
			overlay = $('<div id="fancybox-overlay"></div>'),
			wrap = $('<div id="fancybox" role="dialog" aria-hidden="true" aria-labelledby="fancybox-title" tabindex="-1"></div>')
		);

		outer = $('<div id="fancybox-outer"></div>').appendTo( wrap );

		outer.append(
			content = $('<div id="fancybox-content"></div>'),
			close = $('<a id="fancybox-close" class="fancy-ico" tabindex="1"><span></span></a>'),
			title = $('<div id="fancybox-title-wrap"></div>'),
			nav_next = $('<a id="fancybox-next" class="fancy-ico" tabindex="2"><span></span></a>'),
			nav_prev = $('<a id="fancybox-prev" class="fancy-ico" tabindex="3"><span></span></a>')
		);

		close.click($.fancybox.close);
		loading.click($.fancybox.cancel);

		nav_prev.click(function(e) {
			e.preventDefault();
			$.fancybox.prev();
		});

		nav_next.click(function(e) {
			e.preventDefault();
			$.fancybox.next();
		});
	};

	$.fn.fancybox.defaults = {
		padding : 10,
		margin : 40,
		modal : false,
		cyclic : false,
		allowfullscreen : false,
		scrolling : 'auto',	// 'auto', 'yes' or 'no'

		width : 560,
		height : 340,

		autoScale : true,
		autoDimensions : true,
		autoResize : true,
		keepRatio : false,
		minViewportWidth : 0,

		swipeThreshold: 40,

		ajax : {},
		swf : { wmode: 'opaque' },
		svg : { wmode: 'opaque' },

		hideOnOverlayClick : true,
		hideOnContentClick : false,

		overlayShow : true,
		overlayColor : '',

		titleShow : true,
		titlePosition : 'float', // 'float', 'outside', 'inside' or 'over'
		titleFormat : null,
		titleFromAlt : true,

		transitionIn : 'fade', // 'elastic', 'fade' or 'none'
		transitionOut : 'fade', // 'elastic', 'fade' or 'none'

		speedIn : 400,
		speedOut : 400,

		changeSpeed : 200,
		changeFade : 200,

		easingIn : 'swing',
		easingOut : 'swing',

		showCloseButton	 : true,
		showNavArrows : true,
		enableEscapeButton : true,
		enableKeyboardNav : true,
		enableSwipedNav : true,

		onStart : function(){},
		onCancel : function(){},
		onComplete : function(){},
		onCleanup : function(){},
		onClosed : function(){},
		onError : function(){}
	};

	$(document).ready(function() {
		$.fancybox.init();
	});

})(jQuery);
