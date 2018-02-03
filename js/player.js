/**
 * Modifications copyright (C) 2017 David Ćavar
 */

var player = null;
var debug = false;
var hlsjsCurrentVersion = "0";
var dashjsCurrentVersion = "0";

var loaded1 = loaded2 = false;

var SmoothTech = function() {
    throw "Not implemented.";
}

var DashTech = function(options) {
    this.options = options;
    this.player = dashjs.MediaPlayer().create();
    this.player.getDebug().setLogToBrowserConsole(options.debug);
    
    if(options.protData != undefined) {
        this.player.setProtectionData(options.protData);
    }

    var self = this;
    this.player.on(dashjs.MediaPlayer.events.ERROR, function (e) {
        console.error(e.error + ' : ' + e.event.message);

        if(e.error == 'key_session') {
            self.options.onLicenseError();
            return;
        }

        self.options.onError();
        self.destroy();
    });

    this.player.initialize();
    this.player.label = "dash";
    this.player.attachView(options.video_element);
    this.player.setAutoPlay(options.autoplay);
    this.player.attachSource(this.options.url);

    this.getOptions = function() {
        return this.options;
    }

    this.getPlayer = function() {
        return this.player;
    }

    this.destroy = function() {
        this.player.reset();
        this.player = null;
    }
}

var HlsTech = function(options) {
    this.options = options;
    this.recover_take = 0;
    this.player = new Hls({
        debug: options.debug
    });


    if(this.options.autoplay === true) {
        var self = this;
        this.player.on(Hls.Events.MANIFEST_PARSED, function() {
            self.options.video_element.play();
        });
    }

    this.player.on(Hls.Events.ERROR, function(event, data) {
        var  msg = "Player error: " + data.type + " - " + data.details;

        if(data.fatal) {
            switch(data.type) {
                case Hls.ErrorTypes.MEDIA_ERROR: 
                    console.error("Media error");
                    
                    if(this.recover_take == 1) {
                        hls.swapAudioCodec();
                    }

                    hls.recoverMediaError();
                    this.recover_take++;
                    break;
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error("Network error");
                    hls.startLoad();
                    break;
                default:
                    console.error("Unrecoverable error");
                    this.options.onError();
                    this.destroy();
                    break;
              }
        }
    });


    this.player.loadSource(this.options.url);
    this.player.attachMedia(options.video_element);

    this.getOptions = function() {
        return this.options;
    }

    this.getPlayer = function() {
        return this.player;
    }

    this.destroy = function() {
        this.player.destroy();
        this.player = null;
    }
}

var Player = function(options) {
    this.tech = null;
    this.options = options;

    this.available_events = ["abort", "canplay", "canplaythrough", "durationchange", "emptied", "encrypted", "ended", "error", "interruptbegin", "loadeddata", 
                             "loadedmetadata", "loadstart", "pause", "play", "playing", "progress", "ratechange", "seeked", "seeking", "stalled", "suspend", 
                             "timeupdate", "volumechange", "waiting"];

    if(options.debug == undefined) {
        options.debug = false;
    }

    this.getUrl = function() {
        return this.options.url;
    }

    this.getTech = function() {
        return this.tech;
    }

    this.addEventHandler = function() {
        for(var i = 0; i < this.available_events.length; i++) {
            this.options.video_element.addEventListener(this.available_events[i], this.options.event_handler, false);
        }
    }

    this.removeEventHandler = function() {
        for(var i = 0; i < this.available_events.length; i++) {
            this.options.video_element.removeEventListener(this.available_events[i], this.options.event_handler);
        }
    }

    this.guess = function() {
        if(this.options.tech != undefined) {
            if(this.options.tech = 'dash') {
                this.tech = new DashTech(this.options);
                return;
            }

            if(this.options.tech = 'smooth') {
                this.tech = new SmoothTech(this.options);
                return;
            }

            if(this.options.tech = 'hls') {
                this.tech = new HlsTech(this.options);
                return;
            }
        }

        var url = this.getUrl();

        if(url.indexOf('.mpd') > -1) {
            console.log("Selecting DASH tech...");
            this.tech = new DashTech(this.options);
            return;
        } 
        
        if(url.indexOf('.m3u8')) {
            console.log("Selecting HLS tech...");
            this.tech = new HlsTech(this.options);
            return;
        } 
        
        if(url.indexOf('Manifest')) {
            console.log("Selecting Smooth tech...");
            this.tech = new SmoothTech(this.options);
            return;
        }

        throw 'Url ' + url + ' not recognized.';
    }

    this.play = function() {
        this.options.video_element.play();
    }

    this.pause = function() {
        this.options.video_element.pause();
    }

    this.seek = function(seconds) {
        var v = this.options.video_element;
        v.currentTime = seconds;
    }

    this.getDuration = function() {
        return this.options.video_element.duration;
    }

    this.destroy = function() {
        this.removeEventHandler();
        this.tech.destroy();
        this.tech = null;
    }

    this.addEventHandler()
    this.guess();
}

