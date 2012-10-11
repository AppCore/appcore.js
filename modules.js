AppCore.config({
    appUrl:'http://www.howlerdigital.com.au',
    transitionSpeed: 800,
    easingIn: 'easieEaseInOutCubic', /*'easeInOutBack'*/ /*'easieEaseInOutCubic'*/
    easingOut: 'easeInOutExpo', /*'easeInOutExpo'*/ /*'easeInBack'*/
    transparency: 0.6
})

AppCore.module("layout-manager", function($) {
    $.setContainer($(window));
    var $window = $.getContainer(),
        $bodyH;

    return {
        init : function () {
            $bodyH = parseInt($('body').css('minHeight'));
            $.subscribe("layout-resize", this.resizeHandler)
            $.on('resize', this.resizeNotifier);
            this.resizeNotifier();
            //todo remove when not needed
            $("#home-title p").fitText(1.5);
            $("#home-title h1").fitText(1);
            $("div.title-link b").fitText(0.70, { minFontSize: '12px', maxFontSize: '38px' });
            $("div.title-link i").fitText(0.75, { minFontSize: '12px', maxFontSize: '30px' });
            $("#home-sidebar .nav > ul > li > a").fitText(1, { minFontSize: '14px', maxFontSize: '18px' });
        },
        destroy : function () {
            $.off('resize', this.resizeNotifier);
            $window = null;
            $.unsubscribe();
        },
        resizeNotifier: function(){
            var width = $('body').width(),
                height = $(window).height();
//            if(AppCore.isTouch){
                if(height < $bodyH){
                    height = $bodyH;
                }
//            }
            $.publish( "layout-resize", width, height );
        },
        resizeHandler: function( width, height){
            AppCore.loadAndScale($('img'))
            $('#footer-button').data('wrapHeight', $('#wrap').height(height));
        }
    };
});

AppCore.module("url-processor", function($) {
    $.setContainer($('body'));
    var $document = $.getContainer();

    return {
        init : function () {
            $.subscribe('process-url', this.processUrl);
            $.on('click', 'a', function(){
                var link = $(this),
                    url = link.attr('href');
                if(AppCore.url.isInternalUrl(url)){
                    if(!link.hasClass('no-ajax')){
                        $.publish('process-url', url);
                    }
                    return false;
                }

            });

        },
        destroy : function () {
            $.off('click', 'a');
            $document = undefined;
            $.unsubscribe();
        },
        processUrl: function(url, isSilent, cacheEnabled, namespace){
            if(isSilent === undefined){
                isSilent = false;
            }
            if(AppCore.url.isInternalUrl(url)){
                url = url.replace($.config.appUrl, '');
                if(!isSilent){
                    AppCore.setHash(url)
                }else{
                    AppCore.publish('process_request', AppCore.parseHash(url), cacheEnabled, namespace)
                }

            }
        }
    };
});
/** @event "request" - Gets fired on "url-change" (hashchange). takes configuration object as first parameter:
 * {
     url: request url. Default appUrl.
     type: request type e.g. GET, POST. Default 'GET'.
     data: Data object {} sent to server. Default undefined.
     dataType: Data type of the response e.g. 'xml', 'json', 'html', ... .Default "html".
 }
 Second parameter 'cacheEnabled' - boolean value to enable or disable ajax caching. Cache mechanism hashes 'request' parameter and stores it in key/value dictionary for later retrieval. Default true.
 Module listens for external 'request' events as well. If form submission or any other ajax async action should be executed without changing url and adding new history record this event is the way to do it. Event fires "response" event and passes response object to the event handler.
 Response object:
 {
 type: 'success' or 'error'
 data: raw data returned from the server
 url: request url,
 fromCache: boolean
 }
 * */
AppCore.module("request-processor", function($) {
    $.setContainer(undefined);
    var cache = {},
        callStack = [],
        blockRequestProcessor = false;

    return {
        init : function () {
            $.subscribe('request', this.request);
            $.subscribe('process_request', this.process);
            $.busy( function(){
                blockRequestProcessor = true;
            });
            $.unblock(function(){
                blockRequestProcessor = false;
                if(callStack.length !== 0){
                    this.processFromCallStack(callStack[callStack.length-1].queryString, callStack[callStack.length-1].cacheEnabled, callStack[callStack.length-1].namespace );
                }

            })
            $.hashchange(this.process)
        },
        destroy : function () {
            cache = undefined;
            $.unsubscribe();
        },
        processFromCallStack: function(queryString, cacheEnabled, namespace){
            callStack = [];
            this.process.apply(this, arguments);
        },
        process: function(queryString, cacheEnabled, namespace){

            //todo remove this in production
            if(namespace === undefined){

            }
            if(!blockRequestProcessor){
                var requestObject = {
                    url: $.config.appUrl + queryString.root,
                    data: queryString.params
                }
                if(queryString.params !== {}){
                    requestObject['data'] = queryString.params
                }
                $.busy();
                $.publish('request', requestObject, cacheEnabled, namespace);
            }else{
                callStack.push({queryString: queryString, cacheEnabled: cacheEnabled, namespace: namespace});
            }
        },
        request: function(request, cacheEnabled, namespace){
            if(request.url === $.config.appUrl){
                request.url = request.url + '/';
            }
            var response,
                requestObject = {
                    url: request.url !== undefined ? request.url : window.location,
                    type: request.type !== undefined ? request.type : 'GET',
                    dataType: request.dataType !== undefined ? request.dataType : "html"
                },
                sha1Hash ={},
                useCache = cacheEnabled !== undefined ? cacheEnabled : true;

            if(request.data !== undefined){
                requestObject['data'] = request.data
            }
            if(useCache){
                sha1Hash = '_' + AppCore.hashObject(requestObject);
                if(cache[sha1Hash] === undefined){
                    requestObject['success'] = function(data, status, xhr){
                        cache[sha1Hash] = {};
                        cache[sha1Hash]['type'] = 'success';
                        cache[sha1Hash]['data'] = data;
                        cache[sha1Hash]['url'] = requestObject.url;
                        cache[sha1Hash]['fromCache'] = false;
                        response = cache[sha1Hash];
                        $.publish('response', response, namespace);
                    };
                    requestObject['error'] = function(xhr, status, errorThrown){
                        cache[sha1Hash] = {};
                        cache[sha1Hash]['type'] = 'error';
                        cache[sha1Hash]['data'] = xhr.responseText;
                        cache[sha1Hash]['url'] = requestObject.url;
                        cache[sha1Hash]['fromCache'] = false;
                        response = cache[sha1Hash];
                        $.publish('response', response , namespace);
                    };

                    jQuery.ajax(requestObject);
                }else{
                    cache[sha1Hash]['fromCache'] = true;
                    response = cache[sha1Hash];
                    $.publish('response', response, namespace);
                }
            }else{
                requestObject['success'] = function(data, status, xhr){
                    response = {};
                    response['type'] = 'success';
                    response['data'] = data;
                    response['url'] = requestObject.url;
                    response['fromCache'] = false;
                    $.publish('response', response, namespace);
                };
                requestObject['error'] = function(xhr, status, errorThrown){
                    response = {};
                    response['type'] = 'error';
                    response['data'] = xhr.responseText;
                    response['url'] = requestObject.url;
                    response['fromCache'] = false;
                    $.publish('response', response, namespace);
                };
                jQuery.ajax(requestObject);
            }
        }
    };
});

AppCore.module("document-controller", function($) {
    $.setContainer($(document));
    var $document = $.getContainer(),
        documentTitle = $.find('title'),
        metaDescription = $.find('meta[name="description"]');
    // HTML Helper
    function convertHtml(html){
    			// Prepare
    			var result = String(html)
    				.replace(/<\!DOCTYPE[^>]*>/i, '')
    				.replace(/<(html|head|body|title|meta|script)([\s\>])/gi,'<div data-$1="$1"$2')
    				.replace(/<\/(html|head|body|title|meta|script)\>/gi,'</div>')
    			;
    			// Return
    			return result;
    };
    return {
            init : function () {
                AppCore.startModule(['box-wrap-inner', 'content', 'layout-manager']);
                $.subscribe('response', this.moduleController);
            },
            destroy : function () {
                $.unsubscribe();
                $document = null;
                documentTitle = null;
                metaDescription = null;
            },
            moduleController: function(response, namespace){
                var rawData = $(convertHtml(response.data)),
                    title,
                    metaDesc,
                    template,
                    content;
                namespace = (namespace !== undefined)? namespace+':' : '';
                title = rawData.find('[data-title]').text();
                metaDesc = rawData.find('[name="description"]').attr('content');
                template = rawData.find('[data-template]').attr('data-template');
                content = rawData.find('[data-body]').children().not('#second-nav, #second-sub-nav')

                if((title !== undefined) && (title !== '')){
                    document.title = title;
                }
                if(metaDesc !== undefined && metaDesc !== ''){
                    metaDescription.attr('content', metaDesc);
                }

                if(template !== undefined){
                    AppCore.startPage(template, {content: content, url: response.url, fromCache: response.fromCache});
                    if (typeof _gaq != "undefined"){
                        _gaq.push(['_trackPageview', response.url.replace($.config.appUrl, '')]);
                    }
                }else{
                    $.publish(namespace+'content_ready', {content: content, url: response.url, fromCache: response.fromCache});
                    if (typeof _gaq != "undefined"){
                        _gaq.push(['_trackPageview', response.url.replace($.config.appUrl, '')]);
                    }
                }

            }
    }
});

AppCore.module("box-wrap-inner", function($) {
    var columnsWrapper = $('#forefront');

    return {
        init : function () {
            $.subscribe("layout-resize", function(width, height){
                $('#box-wrap, #homepage-bg, #box-wrap-inner').height( height);
            }, {priority: 9});
            $('#sidebar>*').not('#navigation-border, #navigation-button-wrapper').clone().appendTo('#home-sidebar').hide().show();
            $("#home-title p").fitText(1.5);
            $("#home-title h1").fitText(1);
            $("div.title-link b").fitText(0.70, { minFontSize: '12px', maxFontSize: '38px' });
            $("div.title-link i").fitText(0.75, { minFontSize: '12px', maxFontSize: '30px' });
            $("#home-sidebar .nav > ul > li > a").fitText(1, { minFontSize: '14px', maxFontSize: '18px' });
            $('#wrap div.opaca').stop().animate({'opacity':$.config.transparency}, $.config.transitionSpeed );

            // hover for taking away mouse from the wrapper
            columnsWrapper.on('mouseenter', function(e){
                    AppCore.startModule("columns");
            });
            columnsWrapper.on('mouseleave', function(e){
                    $.find('div.opaca').stop().animate({'opacity': $.config.transparency},$.config.transitionSpeed );
                    AppCore.stopModule("columns");
            });
        },
        destroy : function () {
            columnsWrapper.off('mouseenter')
            columnsWrapper.off('mouseleave')
            columnsWrapper = null;
        }
    };
});

AppCore.module("columns", function ($) {
    var $col = $('#box-wrap-inner > div').not(':first')
    var $colFacade = $('#forefront > a');
    $.setContainer($col);
    var columns = (function (element){
        var boxes = element;
        function activateColumns(){
            boxes.on('mouseenter', function(e){
                var $this = $(this);
                $this.off('click').on('click', function(e){
                    $.publish('process-url', $(this).find('a:first').attr('href'));
                    return false;
                })
                $this.addClass('hovered');
                var arrow = $this.find('.arrow');
                arrow.attr('src', arrow.attr('src').replace('homepage-arrows-black.png', 'homepage-arrows-white.png'));
                $this.find('.opaca').stop().animate({'opacity': 0},$.config.transitionSpeed );
            });
            boxes.on('mouseleave', function(e){
                var $this = $(this);
                $this.off('click');
                $this.removeClass('hovered');
                var arrow = $this.find('.arrow');
                arrow.attr('src', arrow.attr('src').replace('homepage-arrows-white.png', 'homepage-arrows-black.png'));
                $this.find('.opaca').stop().animate({'opacity':$.config.transparency},$.config.transitionSpeed*0.66 );
            });
            $colFacade.on('mouseenter', function(e){
                $('#box-wrap-inner').find('#'+$(this).attr('class')).trigger('mouseenter');
                return false;
            })
            $colFacade.on('mouseleave', function(e){
                $('#box-wrap-inner').find('#'+$(this).attr('class')).trigger('mouseleave');
                return false;
            })
            $colFacade.on('click', function(e){
                $('#box-wrap-inner').find('#'+$(this).attr('class')).trigger('click');
                return false;
            })
        }
        function disableColumns(){
            boxes.off('mouseenter')
            boxes.off('mouseleave')
            $colFacade.off('mouseenter');
            $colFacade.off('mouseleave');
            $colFacade.off('click');
        };
        return {
            on: activateColumns,
            off: disableColumns
        }
    })($.getContainer());

    return {
        init : function () {
            columns.on();
            $('#box-1').on('click', '.nav a.no-ajax', function(){
                $('#footer-button').trigger('click');
            })
            var $hovered;
            $colFacade.each(function(index){
                if($(this).css('textDecoration') == 'underline'){
                    $hovered = $colFacade.eq(index);
                    return false;
                }
            })
            if($hovered !== undefined){
                if(!$hovered.hasClass('sidebar')){
                    $hovered = $('#box-wrap-inner').find('#'+$hovered.attr('class'));
                    $hovered.on('click', function(e){
                        $.publish('process-url', $(this).find('a:first').attr('href'));
                    }).addClass('hovered').find('.opaca').stop().animate({'opacity': 0},$.config.transitionSpeed );
                    var arrow = $hovered.find('.arrow');
                    if(arrow.length != 0){
                        arrow.attr('src', arrow.attr('src').replace('homepage-arrows-black.png', 'homepage-arrows-white.png'));
                    }
                }
            }
        },
        destroy : function () {
            $('#box-1').off('click', '.nav a.no-ajax');
            columns.off();
            $.off('click')
            columns = null;
            $.unsubscribe();
        }
    };
});

AppCore.module("content", function ($) {
    $.setContainer('#captions');
    var $this = $.getContainer(),
        $content = $.find('#captions-content'),
        $close = $.find('#caption-close');

    return {
        init : function () {
            $.subscribe("layout-resize", function(width, height){
                (function(width, height){
                    var $this = $('#captions'),
                        $box = $this.data('target');
                    $content.css({width: '100%', height: height})
                    if($box !== undefined ){
                        var boxWidth = $box.outerWidth(true),
                            boxHeight = $box.outerHeight(true),
                            boxOffsetLeft = $box.offset();
                        boxOffsetLeft = boxOffsetLeft.left;
                        $this.data({'boxWidth':boxWidth, 'boxHeight': boxHeight,'offsetLeft':boxOffsetLeft})
                    }
                })(width, height)
            }, {priority: 8});
            $.subscribe('page-content-open', this.contentOpen);
            $.subscribe('page-content-close', this.contentClose);
            $close.on('mouseenter', function(e){
                $(this).find('.wrapper-close').stop().animate({marginLeft: '-50px'}, 200, 'easeInOutCirc');
                $(this).stop().animate({backgroundColor: '#ffffff'}, 200, $.config.easingIn);
            });
            $close.on('mouseleave', function(e){
                $(this).find('.wrapper-close').stop().animate({marginLeft: '0px'}, 200, 'easeInOutCirc');
                $(this).stop().animate({backgroundColor: '#181818'}, 200, $.config.easingIn);
            });

            $('#footer-caption-close').on('mouseenter', function(e){
                $(this).on('click', function(e){
                    $('#footer-button').trigger('click');
                })
                $(this).find('.wrapper-close').stop().animate({marginLeft: '-50px'}, 200, 'easeInOutCirc');
                $(this).stop().animate({backgroundColor: '#ffffff'}, 200, $.config.easingIn);
            });
            $('#footer-caption-close').on('mouseleave', function(e){
                $(this).off('click')
                $(this).find('.wrapper-close').stop().animate({marginLeft: '0px'}, 200, 'easeInOutCirc');
                $(this).stop().animate({backgroundColor: '#181818'}, 200, $.config.easingIn);
            });

            $('#caption-next').on('mouseenter', function(e){
                $(this).find('.wrapper-close').stop().animate({marginLeft: '-50px'}, 250, 'easeInOutCirc');
                $(this).stop().animate({backgroundColor: '#181818'}, 200, $.config.easingIn);
            });
            $('#caption-next').on('mouseleave', function(e){
                $(this).find('.wrapper-close').stop().animate({marginLeft: '0px'}, 250, 'easeInOutCirc');
                $(this).stop().animate({backgroundColor: '#ffffff'}, 200, $.config.easingIn);
            });
            $('#caption-prev').on('mouseenter', function(e){
                $(this).find('.wrapper-close').stop().animate({marginLeft: '-50px'}, 250, 'easeInOutCirc');
                $(this).stop().animate({backgroundColor: '#181818'}, 200, $.config.easingIn);
            });
            $('#caption-prev').on('mouseleave', function(e){
                $(this).find('.wrapper-close').stop().animate({marginLeft: '0px'}, 250, 'easeInOutCirc');
                $(this).stop().animate({backgroundColor: '#ffffff'}, 200, $.config.easingIn);
            });
        },
        destroy : function () {
            $close.off('mouseenter');
            $close.off('mouseleave');
            $('#footer-caption-close').off('mouseenter');
            $('#footer-caption-close').off('mouseleave');
            $('#caption-next').off('mouseenter');
            $('#caption-next').off('mouseleave');
            $('#caption-prev').off('mouseenter');
            $('#caption-prev').off('mouseleave');
            $this = undefined;
            $close = undefined;
            $.unsubscribe();
        },
        contentOpen : function (targetUrl, content, pageName) {
            var linkLocation = $('#box-wrap-inner').find('[href="'+targetUrl+'"]').parents('[id^="box-"]')[0];
            if(linkLocation === undefined){
                linkLocation = $('[id^="box-1"]')[0];
            }
            $.busy();
            var $box = $(linkLocation),
                boxWidth = $box.outerWidth(true),
                boxHeight = $box.outerHeight(true),
                boxOffsetLeft = $box.offset(),
                $contaner = $this.find('.caption-wraper');
            boxOffsetLeft = boxOffsetLeft.left;
            $contaner.css('right', '1980px').hide()
            $this.addClass('show').data({target: $box, boxWidth: boxWidth, boxHeight: boxHeight, offsetLeft: boxOffsetLeft})
                    .css({'position':'absolute','left': boxOffsetLeft+'px','width': boxWidth, 'height': 0, 'top': '50%', 'opacity': 0 })
                        .stop()
                            .fadeIn($.config.transitionSpeed*1.25, function(){

                            });

            $this.stop()
                .animate({'top': 0, 'height':boxHeight, 'opacity':1 },$.config.transitionSpeed*0.75, $.config.easingIn,
                    function(){
                        $contaner.show()/*.css('right', '350%')*/.stop().delay(100).animate({'right': '50%'}, $.config.transitionSpeed, $.config.easingIn, function(){});
                        $this.stop()
                                .animate({'left': 0, 'width':$('body').width() },$.config.transitionSpeed, $.config.easingOut,
                                    function(){

                                        $this.css({'width':'100%', 'height': '100%'});

                                        $close.on('click', function(e){
                                            $.publish('process-url', $.config.appUrl+'/')
                                        })
                                        var images = content.find('img')
                                        AppCore.loadAndScale(images, false);
                                        $.unblock();
                                        AppCore.progressOpen(pageName);
                                    }
                                ).data({status: 'open'});
                    }
                )

        },
        contentClose : function (pageName) {
            $.busy();
            var $parent = $this;
            if($parent.data('status') === 'open'){
                var bgImage = $content.find('.bg-holder img');
                bgImage.removeClass('loaded').stop().fadeOut($.config.transitionSpeed*0.5, function(){});
                $parent.stop().delay($.config.transitionSpeed*0.5).animate({'left': $parent.data('offsetLeft'), 'width':$parent.data('boxWidth') },$.config.transitionSpeed, $.config.easingIn,
                    function(){
                        $parent.stop().fadeOut($.config.transitionSpeed*0.66, function(){
                            $parent.removeAttr('style').removeData('status').removeClass('show').find('.caption-wraper').removeAttr('style');
                            $this.removeData('target');
                            $this.removeData('boxWidth');
                            $this.removeData('boxHeight');
                            $this.removeData('offsetLeft');
                            $close.off('click');
                            $content.empty();
                            AppCore.progressClose(pageName);
                        });
                    });
                $parent.find('.caption-wraper').animate({'right': '-100%'}, $.config.transitionSpeed*1,'easeInOutBack', function(){
                    $(this).hide()
                });
            }else{
                AppCore.progressClose(pageName);
            }
        }

    };
});

AppCore.module("sidebar", function ($) {
    var $that = $.getContainer(),
        $navigationRevealButton = $.find('#navigation-button-wrapper'),
        //remove class "small" from "#navigation-button-wrapper" to make it half circle
        isSmallButton = $navigationRevealButton.hasClass('small'),
        $navigationRevealButtonWidth = $navigationRevealButton.width();

    return {
        init: function(){
            $that.on('click', '.nav a.no-ajax', function(){
                $('#footer-button').trigger('click');
            })
            $.subscribe('sidebar_open', this.openSidebar)
            $.subscribe('sidebar_close', this.closeSidebar)
            $.subscribe('sidebar_reveal', this.revealSidebar)
            $.subscribe('sidebar_hide', this.hideSidebar)
            $.on('mouseenter', function(){
                if($that.data('status') == 'close'){
                    $.publish('sidebar_open')
                    $that.data('status', 'open')
                }
            });
            $.on('mouseleave', function(){
                if($that.data('status') == 'open'){
                    $.publish('sidebar_close')
                    $that.data('status', 'close')
                }
            });
            $.publish('sidebar_reveal')

        },
        destroy : function () {
            $('#sidebar').off('click', '.nav a.no-ajax')
            $.off('mouseenter');
            $.off('mouseleave');
            $that = undefined;
            $.unsubscribe();
        },
        openSidebar: function(){
            $that.stop().animate({left: '0px'}, $.config.transitionSpeed, $.config.easingIn);
            if(!isSmallButton){
                $navigationRevealButton.stop().animate({width: '0px'}, $.config.transitionSpeed, $.config.easingIn);
            }else{
                $navigationRevealButton.addClass('open').stop().animate({left: '100%'}, $.config.transitionSpeed, $.config.easingIn);
            }

        },
        closeSidebar: function(){
            $that.stop().animate({left: '-220px'}, $.config.transitionSpeed, $.config.easingOut);
            if(!isSmallButton){
                $navigationRevealButton.stop().animate({width: $navigationRevealButtonWidth}, $.config.transitionSpeed, $.config.easingOut);
            }else{
                $navigationRevealButton.removeClass('open').stop().animate({left: '91%'}, $.config.transitionSpeed, $.config.easingOut);
            }
        },
        revealSidebar: function(){
            $that.data('status', 'close');
            $navigationRevealButton.removeAttr('style');
            $that.stop().animate({left: '-220px'}, $.config.transitionSpeed, $.config.easingOut);
        },
        hideSidebar: function(){
            $that.data('status', 'close');
            $that.stop().animate({left: '-308px'}, $.config.transitionSpeed*0.5, $.config.easingOut);
            $navigationRevealButton.removeClass('open')
        }

    }
});

AppCore.page("home", function ($) {
    $.setContainer('#captions');
    var $this = $.getContainer();
    var test = {};
    var $response = $.data;
    return {
        init: function(){
            if(!$.data.fromCache){
                AppCore.loadAndScale($.data.content.find('img'), false);
            }
        },
        pageLoad : function(){
            $('#captions').stop();
            $.unblock();
            AppCore.progressOpen('home');
        },
        pageReady : function(){
            $.unblock();
        },
        beforeDestroy : function(){
            $.publish('page-content-close', 'home')
        },
        destroy : function () {
            $this = undefined;
            $.unsubscribe();
        }

    }
});

AppCore.page("regular-page", function ($) {
    $.setContainer('#captions');
    var $this = $.getContainer(),
        $content = $.find('#captions-content'),
        $response = $.data;
    return {
        init: function(){
            $response.content.find('img').addClass('loading');
            $content.append($response.content);
            if(!$response.fromCache){
                AppCore.loadImages($response.content.find('img'));
            }
        },
        pageLoad : function(){
            $.publish('page-content-open', $response.url, $response.content, 'regular-page')
        },
        pageReady : function(){
            AppCore.startModule('sidebar');
        },
        beforeDestroy : function(){
            $.publish('sidebar_hide');
            $.publish('page-content-close', 'regular-page')
        },
        destroy : function () {
            AppCore.stopModule('sidebar')
            $this = undefined;
            $.unsubscribe();
        }
    }
})

AppCore.page("scrollpath", function ($) {
    $.setContainer('#captions');
    var $that = $.getContainer(),
        $controls,
        $navigation,
        $pages,
        $pagesCount,
        width,
        height,
        blockWidth,
        blockWidthPosition,
        lastPageIndex = 1,
        activePageIndex = 0,
        $background = $that.find('#presenter > .bg-holder'),
        $images = $background.find('img'),
        $pattern,
        $response = $.data,
        $content = $.find('#captions-content');
    function changeImages(image){
        var newSrc = image,
            $newImg;
        $newImg = $images.not('.active');
        if($newImg.length > 1){
            $newImg = $newImg.eq(0);
        }
        if($newImg.siblings('img').attr('src') !== newSrc){
            /*$contentWrapper.find('.caption-close').addClass('loading')*/
            AppCore.loadImages(newSrc,{
                progressBar : false ,
                progress: function(){
                    $newImg.hide().addClass('loading').attr('src', newSrc).removeAttr('data-width').removeAttr('data-height');
                    AppCore.scaleImage($newImg, function(){
                        $images.removeClass('active');
                        swapPages();
                        $newImg.show().addClass('active').css('top', $newImg.attr('data-scale-height')+'px').removeClass('loading').stop().animate({top: $newImg.attr('data-scale-top')}, $.config.transitionSpeed*1, function(){
                            /*$contentWrapper.find('.caption-close').removeClass('loading')*/
                        })
                    });
                }
            });
        }
    }
    function setPattern(pattern){
        $pattern.attr('class', 'pattern '+ pattern);
    }
    function activateButton($this, pageName){
        var navElements = $navigation.find('li');
        if(navElements.index($this) != 0){
            $navigation.removeClass('colors').addClass('active');
        }else{
            $navigation.removeClass('active').addClass('colors');
        }
        navElements.removeClass('active');
        $this.addClass('active');
    }
    function swapPages(){
        var $lastPage = $pages.eq(lastPageIndex),
            $newPage = $pages.eq(activePageIndex);
        $lastPage.css({position: 'absolute', top: '0px', width: blockWidth}).stop().animate({left:'200%'},400, 'linear', function(e){
            $lastPage.removeClass('active').removeAttr('style');
            $newPage.css({left: (width*-1), position: 'absolute', top: '0px', width: blockWidth}).addClass('active').stop().animate({left:'0px'}, 400, 'easeOutCirc', function(){
                $newPage.removeAttr('style');
            })
        })


    }
    return {
        init: function(){
            //pre-load images and attach content
            var images = $response.content.find('img').addClass('loading');
            $content.append($response.content);
            if(!$response.fromCache){
                images.hide()
                AppCore.loadAndScale(images);
                var timeout = setTimeout(function(){
                    images.show();
                    clearTimeout(timeout)
                },1500)
            }

            //set dom variable for future use
            $controls = $.find('.caption-control');
            $navigation = $.find('.caption-navigation');
            $pages = $.find('.caption > div');
            $pagesCount = $pages.length;
            $background = $that.find('#captions-content > div > .bg-holder');
            $images = $background.find('img'),
            $pattern = $background.find('.pattern');


            $controls.addClass('active');
            $.subscribe("layout-resize", function(width, height){
                width = $that.width();
                height = $that.height();
                blockWidth = $.find('.caption-wraper').width();
                blockWidthPosition = parseInt($.find('.caption-wraper').css('marginLeft'));
            }, {priority: 10})
            $.on('click','.caption-navigation ul li', function(e){
                var $this = $(this),
                    _pageName = $this.attr('data-connect'),
                    $page = $('#' + _pageName),
                    _internalIndex = $pages.index($page),
                    _image = $page.attr('data-image'),
                    _pattern = $page.attr('data-pattern');
                if(_internalIndex !== activePageIndex){
                    lastPageIndex = activePageIndex;
                    activePageIndex = _internalIndex;
                    setPattern(_pattern);
                    activateButton($this, _pageName);
                    changeImages(_image);

                }
            });
            $.on('click','.caption-control > div',function(e){
                var $this= $(this),
                    controller = 0,
                    index;
                if($this.attr('id') == 'caption-next'){
                    controller = +1;
                }else{
                    controller = -1;
                }
                index = activePageIndex + controller;
                if(index > 0 && index < $pagesCount){
                    index = index;
                }else{
                    if(index == 0){
                       index = 0
                    }
                    if(index < 0){
                       index = $pagesCount - 1;
                    }
                    if(index == $pagesCount){
                        index = 0;
                    }
                }
                $('.caption-navigation ul li').eq(index).trigger('click');
            });
        },
        pageLoad : function(){
            $.publish('page-content-open', $response.url, $response.content, 'scrollpath')
        },
        pageReady : function(){
            width = $that.width();
            height = $that.height();
            blockWidth = $.find('.caption-wraper').width();
            blockWidthPosition = parseInt($.find('.caption-wraper').css('marginLeft'));
            AppCore.startModule('sidebar')
        },
        beforeDestroy : function(){
            $.publish('sidebar_hide');
            $.publish('page-content-close', 'scrollpath')
        },
        destroy : function () {
            $controls.removeClass('active')
            $.off('click','.caption-control > div')
            $.off('click','.caption-navigation ul li')
            AppCore.stopModule('sidebar')
            $that = undefined;
            $.unsubscribe();
        }

    }
})

AppCore.page("portfolio", function ($) {
    $.setContainer('#captions');
    var $that = $.getContainer(),
        $controls,
        $projectNavigation = {},
        $sideBarControl,
        width,
        height,
        projNav,
        $response = $.data,
        $content = $.find('#captions-content'),
        activeProject = 0,
        projects,
        projectCount = 0;

    function calculateNavSizes(){
        $projectNavigation.height = $projectNavigation.$.height();
        $projectNavigation.top = $projectNavigation.$.offset().top;
        $projectNavigation.content.hight = $projectNavigation.content.$.height();
        $projectNavigation.isActive = ($projectNavigation.height < $projectNavigation.content.hight)? true: false;
        $projectNavigation.navConDiff = $projectNavigation.content.hight - $projectNavigation.height;
    }

    //GetTranslate
    function getTranslate(element, axis){
        var el = element
        if (window.WebKitCSSMatrix) {
            var transformMatrix = new WebKitCSSMatrix(window.getComputedStyle(el, null).webkitTransform)
        }
        else {
            var transformMatrix = window.getComputedStyle(el, null).MozTransform || window.getComputedStyle(el, null).OTransform || window.getComputedStyle(el, null).MsTransform || window.getComputedStyle(el, null).msTransform || window.getComputedStyle(el, null).transform
        }
        if (axis=='x') {
            var curTransform = parseInt( transformMatrix.toString().split(',')[4], 10 )
        }

        if (axis=='y') {
            var curTransform = parseInt( transformMatrix.toString().split(',')[5], 10 )
        }

        return curTransform;
    }

//Set Transform
    function setTransform(element,x,y,z) {
        var es = element.style
        x=x||0;
        y=y||0;
        z=z||0;
        if (AppCore.is3DSupported) {
            es.webkitTransform = es.MsTransform = es.msTransform = es.MozTransform = es.OTransform = es.transform = 'translate3d('+x+'px, '+y+'px, '+z+'px)'
        }
        else {
            es.webkitTransform = es.MsTransform = es.msTransform = es.MozTransform = es.OTransform = es.transform = 'translate('+x+'px, '+y+'px)'
        }
    }

//Set Transition
    function setTransition(element,duration) {
        var es = element.style
        es.webkitTransitionDuration = es.MsTransitionDuration = es.msTransitionDuration = es.MozTransitionDuration = es.OTransitionDuration = es.transitionDuration = duration/1000+'s'
    }
        return {
        init: function(){
            $response.content.find('img').addClass('loading');
            $content.append($response.content);
            if(!$response.fromCache){
                AppCore.loadAndScale($response.content.find('img'));
            }
            if(!AppCore.isRunning('project')){
                AppCore.startModule('project');
            }
            if(window.location.href.lastIndexOf('.html') === -1){
                AppCore.publish('process-url', $('#project-navigation li a:first').attr('href'), true, true, 'project');
            }
            $controls = $.find('.caption-control');
            $projectNavigation = {};
            $sideBarControl = $.find('#navigation-button-wrapper');
            $projectNavigation.$ = $.find('#project-navigation');
            $projectNavigation.content = {$:$projectNavigation.$.find('ul')};
            projNav = (function (element){
                var navElements = element.find('li');
                navElements.eq(0).addClass('first');
                navElements.eq((navElements.length - 1) >= 0 ? navElements.length - 1: 0).addClass('last');
                function activateColumns(){
                    var isFirst,
                        isLast;
                    navElements.on('mouseenter', function(e){
                        var $this = $(this);
                            isFirst = $this.hasClass('first'),
                            isLast = $this.hasClass('last');

                        $this.off('click').on('click', function(e){
                            $.publish('process-url', $(this).find('a:first').attr('href'));
                            return false;
                        })
                        $this.addClass('hovered');
                        $this.find('a span').stop().animate({'opacity': 0},$.config.transitionSpeed );

                    });
                    navElements.on('mouseleave', function(e){
                        var $this = $(this);
                        $this.off('click');
                        $this.removeClass('hovered');
                        $this.find('a span').stop().animate({'opacity':$.config.transparency},$.config.transitionSpeed*0.66 );
                    });
                    // Trigger mouse move event over the 'menu_holder'.
                    $.on('mousemove', '#project-navigation', function(e) {
                        // Enable scroll function only when the height of the 'slider' or menu is greater than the 'menu_holder'.
                        if($projectNavigation.isActive) {
                            // Calculate the distance value from the 'menu_holder' y pos and page Y pos.
                            var distance = e.pageY - $projectNavigation.top;
                            // Get the percentage value with respect to the Mouse Y on the 'menu_holder'.
                            var percentage = distance / $projectNavigation.height;
                            // Calculate the new Y position of the 'slider'.
                            var targetY = isLast ? '+=69': isFirst ? 0: ($projectNavigation.navConDiff * percentage);
                            // With jQuery easing funtion from easing plugin.
                            $projectNavigation.$.stop().scrollTo({
                                top: targetY + "px"
                            }, 1500, {
                                easing: "easeOutCirc",
                                axis: "y",
                                over: 200
                            })
                        }
                    });
                    if(AppCore.isTouch){
                        var projects = $('#project-navigation > ul');
                        var prev = 0;
                        var cssdist = 0;
                        projects[0].addEventListener('touchstart', function(e){
                            prev = Math.abs(event.touches[0].clientY);
                            cssdist = parseInt(getTranslate(element, 'y'))
    //                        document.ontouchmove = function(e){ e.preventDefault(); }
                        }, false);
                        projects[0].addEventListener('touchmove', function(e){
                                if($projectNavigation.isActive) {
                                cssdist += (Math.abs(event.touches[0].clientY) - prev);
                                prev = Math.abs(event.touches[0].clientY);

                                if(cssdist > 0){
                                    cssdist = 0;
                                }
                                if(cssdist < (-$projectNavigation.navConDiff)){
                                    cssdist = (-$projectNavigation.navConDiff);
                                }
                                setTransform(projects[0],0, cssdist, 0);
                                setTransition(projects[0],0.2)
                            }
                        }, false);
    //                    projects[0].addEventListener('touchend', function(e){
    //                        document.body.removeEventListener('touchstart', function(){}, false);
    //                    }, false);
                    }


                }
                function disableColumns(){
                    navElements.off('mouseenter')
                    navElements.off('mouseleave')
                    if(AppCore.isTouch){
                        projects[0].removeEventListener('touchstart')
                        projects[0].removeEventListener('touchmove')
                    }
                    $.off('mousemove', '#project-navigation');
                };
                return {
                    on: activateColumns,
                    off: disableColumns
                }
            })($projectNavigation.$);

            $controls.addClass('active');
            projects = $projectNavigation.$.find('li a');
            projectCount = projects.length;
            activeProject = projects.index( projects.filter('[href="'+window.location.href.replace('#/', '')+'"]') );
            if(activeProject === -1){
                activeProject = 0;
            }

            $.on('click','.caption-control > div',function(e){
                var $this= $(this),
                    controller = 0,
                    index;
                if($this.attr('id') == 'caption-next'){
                    controller = +1;
                }else{
                    controller = -1;
                }
                index = activeProject + controller;
                if(index > 0 && index < projectCount){
                    index = index;
                }else{
                    if(index == 0){
                        index = 0
                    }
                    if(index < 0){
                        index = projectCount - 1;
                    }
                    if(index == projectCount){
                        index = 0;
                    }
                }
                activeProject = index;
                projects.eq(index).trigger('click');
            });

            $.subscribe("layout-resize", function(width, height){
                width = $that.width();
                height = $that.height();
                calculateNavSizes();
            }, {priority: 10});

            AppCore.startModule('sidebar')
        },
        pageLoad : function(){
            $.publish('page-content-open', $response.url, $response.content, 'portfolio')
        },
        pageReady : function(){
            width = $that.width();
            height = $that.height();
            calculateNavSizes();
            projNav.on();
        },
        beforeDestroy : function(){
            $.publish('sidebar_hide');
            $('#presenter').stop().animate({marginLeft: '-480px'}, $.config.transitionSpeed*1.5, $.config.easingIn, function(){})
            $.publish('page-content-close', 'portfolio')
        },
        destroy : function () {
            $controls.removeClass('active');
            $('#presenter').removeAttr('style');
            projNav.off();
            $.off('click','.caption-control > div')
            AppCore.stopModule('sidebar')
            AppCore.stopModule('project')
            $that = undefined;
            $.unsubscribe();
        }

    }
});

AppCore.module('project', function ($) {
    $.setContainer('#captions');
    var $that = $.getContainer(),
        $caption = $.find('.caption'),
        $background = $that.find('#presenter > .bg-holder'),
        $images = $background.find('img'),
        $response,
        $content = $.find('#captions-content'),
        isFirstTime = true,
        $contentWrapper = $content.find('.caption-wraper'),
        onload,
        $responseImages;
    function createImage(url){
        return '<img src="'+url+'" />';
    }
    return {
        init: function(){
//            $.unblock();
                $.subscribe('project:content_ready', function(param){
                    $response = param;
                    onload = this.onLoad;
                    this.prepareContent(function(){
                        if(isFirstTime){
                            onload();
                        }
                    });

                    this.project();
                    $.unblock();
                });
        },
        prepareContent: function(callback){
            $responseImages = $response.content.find('img');
            if(isFirstTime){
                AppCore.loadAndScale($responseImages);
            }else{
                if(!$response.fromCache){
                    AppCore.loadAndScale($responseImages, false);
                }
            }


            $contentWrapper.stop().animate({bottom: -($contentWrapper.height()*1.13)+'px'}, $.config.transitionSpeed, 'easeOutQuint', function(){
                $contentWrapper.empty().append($response.content.find('.caption-wraper > *')).css({left: '150%', bottom: '10%'})
                    .stop().animate({left:'50%'}, $.config.transitionSpeed).find('.caption-close').addClass('loading');
                $caption = $.find('.caption');
                callback();
                AppCore.loadAndScale($responseImages, false);
                $('#thumbs img').eq(0).trigger('click');
            })
        },
        onLoad: function(){
            isFirstTime = false;
            onload = undefined;
            $.on('click', '.caption-close', function(){
                $caption.toggleClass('closed');
            });

            $.on('click', '#thumbs img', function(){
                var $this = $(this),
                    newSrc = $this.attr('data-image'),
                    $newImg;
                $newImg = $images.not('.active');
                if($newImg.length > 1){
                    $newImg = $newImg.eq(0);
                }
                if($newImg.siblings('img').attr('src') !== newSrc){
                    $contentWrapper.find('.caption-close').addClass('loading')
                    AppCore.loadImages(newSrc,{
                        progressBar : false ,
                        progress: function(){
                            $newImg.hide().addClass('loading').attr('src', newSrc).removeAttr('data-width').removeAttr('data-height');
                            AppCore.scaleImage($newImg, function(){
                                $images.removeClass('active');
                                $newImg.show().addClass('active').css('top', -$newImg.attr('data-scale-height')+'px').removeClass('loading').stop().animate({top: $newImg.attr('data-scale-top')}, $.config.transitionSpeed*1.2, function(){
                                    $contentWrapper.find('.caption-close').removeClass('loading')

                                })
                            });
                        }
                     });
                }

            });
        },
        project: function(){

        },
        destroy : function () {
            $that = undefined;
            $.off('click', '.caption-close');
            $.off('click', '#thumbs img')
            $.unsubscribe();
        }
    }
});

AppCore.subscribe('onStart', function(){
    AppCore.startModule(['url-processor', 'request-processor', "document-controller"]);
})

AppCore.route('/how-we-work.html', function () {
    AppCore.publish('url-change',{root:AppCore.root(), params:AppCore.query()})
});

AppCore.route('/projects/{_page}', function () {
    if(!AppCore.isRunning('portfolio')){
        AppCore.publish('process-url', AppCore.config().appUrl+'/projects/', true, true);
    }
    AppCore.publish('process_request',{root:AppCore.root(), params:AppCore.query()}, true, 'project');
});

AppCore.route('/projects/', function () {

    if(!AppCore.isRunning('portfolio')){
        AppCore.publish('process_request',{root:AppCore.root(), params:AppCore.query()});
    }

 });

AppCore.route('/{_page}.html', function () {
    AppCore.publish('url-change',{root:AppCore.root(), params:AppCore.query()})
});

AppCore.route('/', function () {
    AppCore.publish('url-change',{root:AppCore.root(), params:AppCore.query()})
});


AppCore.route('', function () {
    AppCore.publish('url-change',{root:AppCore.root(), params:AppCore.query()})
});


$(document).ready(function(){
    AppCore.run();
})