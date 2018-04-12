"use strict";

/**
 * Working with sounds.
 *
 * @param {Object} [params] Parameters.
 *     @param {Array<{name: string, loop: boolean, volume: number}>} [params.sounds] Sounds data to play.
 *     @param {string} [params.path] Path to the folder with sounds.
 *     @param {boolean} [params.autoplay = false]
 *     @param {boolean} [params.loop = false]
 *     @param {boolean} [params.muted = false]
 *     @param {boolean} [params.preload = true]
 *     @param {number} [params.volume = 1]
 *
 * @version 1.0.0
 * @author Balov Bohdan <balovbohdan@gmail.com>
 * @constructor
 *
 * @example
 *
 * // Make instance.
 * var sounder = Sounder.init({
 *     sounds: [
 *         { name: "sound-1", loop: true, volume: 1.0 },
 *         { name: "sound-2"}
 *     ],
 *     path: "/sounds/",
 *     preload: true,
 *     volume: 1.0
 * });
 *
 * // Play sounds.
 * sounder.play("sound-1");
 * sounder.play("sound-2");
 *
 * // Destruct instance after 5 seconds.
 * // Playing sounds will be stopped.
 * // Data of instance will be destructed.
 * setTimeout(sounder.destruct.bind(sounder), 5000);
 */
function Sounder(params) {
    params = params || {};

    /**
     * Attributes that is going to be
     * used for audio elements.
     * @type {string[]}
     * @private
     */
    this.__attrs = [
        "autoplay",
        "loop",
        "muted",
        "preload",
        "volume"
    ];

    /**
     * Extensions of audio elements to work with.
     * This is needed to make sources for <audio> element.
     * @type {Object}
     * @private
     */
    this.__exts = {
        all: [Sounder.WAV, Sounder.OGG, Sounder.AAC, Sounder.MP3, Sounder.MP4],
        firefox: [Sounder.OGG, Sounder.MP3, Sounder.WAV],
        chrome: [Sounder.OGG, Sounder.MP4, Sounder.MP3, Sounder.WAV, Sounder.AAC],
        opera: [Sounder.OGG],
        safari: [Sounder.MP4, Sounder.MP3, Sounder.WAV, Sounder.AAC],
        explorer: [Sounder.MP3],
        edge: [Sounder.MP4, Sounder.MP3, Sounder.WAV, Sounder.AAC]
    };

    /**
     * Available sound extensions for current browser.
     * @type {Promise}
     * @private
     */
    this.__browserExts = this.__getBrowserExts();

    /**
     * Data of sounds to play.
     * @type {Array}
     */
    this.__sounds = this.__prepareSounds(params.sounds);

    /**
     * Parh to the root of sounds.
     * @type {string}
     * @private
     */
    this.__path = typeof params.path === "string" ? params.path : "";

    /**
     * Is it needed to autoplay sounds?
     * @type {boolean}
     * @private
     */
    this.__autoplay = typeof params.autoplay === "string" ? params.autoplay : false;

    /**
     * Is it needed to loop sounds?
     * @type {boolean}
     * @private
     */
    this.__loop = typeof params.loop === "boolean" ? params.loop : false;

    /**
     * Is it needed to mute sounds?
     * @type {boolean}
     * @private
     */
    this.__muted = typeof params.muted === "boolean" ? params.muted : false;

    /**
     * Is it needed to preload sounds?
     * @type {boolean}
     * @private
     */
    this.__preload = typeof params.preload === "boolean" ? params.preload : true;

    /**
     * Volume of sounds.
     * @type {number}
     * @private
     */
    this.__volume = typeof params.volume === "number" ? params.volume : 1;

    /**
     * Is instance ready?
     * @type {boolean}
     * @private
     */
    this.__ready = false;

    /**
     * Is instance preparing right now?
     * @type {boolean}
     * @private
     */
    this.__preparing = false;

    /**
     * Preparing promise of instance.
     * @type {null|Promise}
     * @private
     */
    this.__preparingPromise = null;
}

Sounder.prototype.name = "Sounder";

/////////////////////////////////////////////////////////////////////////////////////

// Audio extensions.

/**
 * OGG.
 * @type {string}
 */
Sounder.OGG = "ogg";

/**
 * MP4.
 * @type {string}
 */
Sounder.MP4 = "mp4";

/**
 * MP3.
 * @type {string}
 */
Sounder.MP3 = "mp3";

/**
 * WAV.
 * @type {string}
 */
Sounder.WAV = "wav";

/**
 * AAC.
 * @type {string}
 */
Sounder.AAC = "aac";

/////////////////////////////////////////////////////////////////////////////////////

// Audio types.
// More details at:
// 1) http://diveintohtml5.info/everything.html
// 2) https://www.w3schools.com/tags/av_met_canplaytype.asp

/**
 * "OOG" audio type.
 * @type {string}
 */
Sounder.OGG_TYPE = 'audio/ogg; codecs="vorbis"';

/**
 * "MP4" audio type.
 * @type {string}
 */
Sounder.MP4_TYPE = 'audio/mp4; codecs="mp4a.40.5"';

/**
 * "MP3" audio type.
 * @type {string}
 */
Sounder.MP3_TYPE = 'audio/mpeg;';

/**
 * "WAV" audio type.
 * @type {string}
 */
Sounder.WAV_TYPE = 'audio/wav; codecs="1"';

/**
 * "AAC" audio type.
 * @type {string}
 */
Sounder.AAC_TYPE = 'audio/mp4; codecs="mp4a.40.2"';

/**
 * Returns type of audio.
 * @param {string} ext Audio extension.
 * @returns {string}
 * @throws {Error}
 * @private
 */
Sounder.__getAudioType = function (ext) {
    if (!ext) throw new Error("Got incorrect audio extension: " + ext + ".");
    var type = Sounder[ext.toUpperCase() + "_TYPE"];
    if (!type) throw new Error("Failed at looking for audio type '" + type + "'.");
    return type;
};

/**
 * Says if browser can play audio with certain extension.
 * @param {string} ext Audio extension.
 * @returns {boolean}
 * @throws {Error}
 * @private
 */
Sounder.__canPlayExt = function (ext) {
    var a = document.createElement("audio");
    return !!(a.canPlayType && a.canPlayType(Sounder.__getAudioType(ext)).replace(/no/, ''));
};

/////////////////////////////////////////////////////////////////////////////////////

// Main interface.

/**
 * Makes ready instance.
 * @param {Object} [params] Parameters. See constructor.
 * @return {Sounder}
 */
Sounder.init = function (params) {
    var sounder = new Sounder(params);
    sounder.prepare().catch(console.warn.bind(null, "Failed at preparing 'Sounder' instance."));
    return sounder;
};

/**
 * Makes destructing of the instance.
 * Removes prepared sounds.
 * @returns {Promise}
 */
Sounder.prototype.destruct = function () {
    return this.stopAll().then(function () { this.__sounds = [] }.bind(this));
};

/**
 * Trys to play sound.
 * @param {string} soundName Name of sound to play.
 */
Sounder.prototype.play = function (soundName) {
    this.wait()
        .then(function () { this.__getSoundData(soundName).audio.play(); }.bind(this))
        .catch(function (e) { console.warn("Failed at playing sound with name '" + soundName + "'.", e); });
};

/**
 * Trys to set sound on pause.
 * @param {string} soundName Name of sound to set on pause.
 * @returns {Promise}
 */
Sounder.prototype.pause = function (soundName) {
    return this.wait()
        .then(function () { this.__getSoundData(soundName).audio.pause(); }.bind(this))
        .catch(function (e) { console.warn("Failed at setting '" + soundName + "' sound on pause.", e); });
};

/**
 * Trys to stop sound.
 * @param {string} soundName Name of the sound to stop.
 * @returns {Promise}
 */
Sounder.prototype.stop = function (soundName) {
    return this.pause(soundName).then(function () { this.__getSoundData(soundName).audio.currentTime = 0; }.bind(this));
};

/**
 * Trys to stop all sounds.
 * @returns {Promise}
 */
Sounder.prototype.stopAll = function () {
    return Promise.all(this.__sounds.map(function (sound) { return this.stop(sound.name); }.bind(this)));
};

/**
 * Says if there is sound with some name.
 * @param {string} soundName
 * @return {boolean}
 */
Sounder.prototype.hasSound = function (soundName) {
    try {
        return Boolean(this.__getSoundData(soundName));
    } catch (e) {
        return false;
    }
};

/**
 * Adds sounds to the instance.
 * This sounds is going to be prepared.
 * @param {Array} sounds Data of sounds to add. (For details see object constructor.)
 * @return {Promise}
 */
Sounder.prototype.addSounds = function (sounds) {
    return this.__makeAudioElemsFromData(sounds)
        .then(function (sounds) {
            this.__updateSounds(sounds);
            return this;
        }.bind(this));
};

/**
 * Waits while instance is preparing.
 * @return {Promise<Sounder>}
 */
Sounder.prototype.wait = function () {
    if (this.__ready) return Promise.resolve(this);
    if (this.__preparing) return this.__preparingPromise;
    return this.prepare();
};

/**
 * Prepares instance.
 * @return {Promise}
 */
Sounder.prototype.prepare = function () {
    if (this.__ready) return Promise.resolve(this);
    if (this.__preparing) return this.__preparingPromise;
    this.__preparing = true;

    return this.__preparingPromise = this.__makeAudioElems()
        .then(function () {
            this.__ready = true;
            this.__preparing = false;
            return this;
        }.bind(this))
        .catch(function () {
            this.__ready = false;
            this.__preparing = false;
            console.warn("Failed at preparing <audio> elements.");
        }.bind(this));
};

/////////////////////////////////////////////////////////////////////////////////////

// Validators.

/**
 * Says if HTML attribute of <audio> element is valid.
 * @param {string} attr Name of attribute to validte.
 * @return {boolean}
 */
Sounder.prototype.validateAttr = function (attr) {
    return this.__attrs.includes(attr);
};

/**
 * Says if HTML attribute of <audio> element is valid.
 * Strict version.
 * @param {string} attr Name of attribute to validte.
 * @return {string} Valid name of attribute.
 */
Sounder.prototype.validateAttrStrict = function (attr) {
    if (this.validateAttr(attr)) return attr;
    throw new Error("Got invalid HTML attribute of <audio> element.");
};

/**
 * Says if <audio> element is valid.
 * @param {*} audio
 * @return {boolean}
 * @private
 */
Sounder.prototype.__validateAudioElem = function (audio) {
    return audio instanceof HTMLAudioElement;
};

/**
 * Says if <audio> element is valid.
 * Strict version.
 * @param {*} audio
 * @return {HTMLAudioElement}
 * @private
 */
Sounder.prototype.__validateAudioElemStrict = function (audio) {
    if (this.__validateAudioElem(audio)) return audio;
    throw new Error("Got invalid <audio> element.");
};

/**
 * Says if audio extension is valid.
 * @param {string} ext
 * @return {boolean}
 */
Sounder.prototype.validateExt = function (ext) {
    return this.__exts.all.includes(ext);
};

/**
 * Says if audio extension is valid.
 * @param {string} ext
 * @return {string} Valid audio extension.
 */
Sounder.prototype.validateExtStrict = function (ext) {
    if (this.validateExt(ext)) return ext;
    throw new Error("Got invalid audio extension.");
};

/////////////////////////////////////////////////////////////////////////////////////

// Parameters of instance.

/**
 * Prepares parameters of sounds.
 * @param {Array} [sounds] Sounds parameters got from client side.
 * @return {Array} Prepared parameters of sounds.
 * @private
 */
Sounder.prototype.__prepareSounds = function (sounds) {
    sounds = Array.isArray(sounds) ? sounds : [];

    if (!sounds.length) return [];

    return sounds.map(function (sound) {
        if (!sound.name) throw new Error("Got incorrect sound name.");
        return $.extend(this.__getDefSoundParams(), sound);
    }.bind(this));
};

/**
 * Returns default paramsters of instance.
 * @return {Object}
 * @private
 */
Sounder.prototype.__getDefParams = function () {
    return {
        sounds: [],
        path: "",
        autoplay: false,
        loop: false,
        muted: false,
        preload: true,
        volume: 1
    };
};

/**
 * Returns default parameters for sound.
 * @return {Object}
 * @private
 */
Sounder.prototype.__getDefSoundParams = function () {
    return {
        autoplay: false,
        loop: false,
        muted: false,
        preload: true,
        volume: 1
    };
};

/////////////////////////////////////////////////////////////////////////////////////

// Making of audio element.

/**
 * Makes audio elements from data saved locally.
 * Audio elements is going to be saved at "this.__sounds" data.
 * (Data "this.__sounds" got from client side.)
 * @return {Promise} Updated data of sounds.
 * @private
 */
Sounder.prototype.__makeAudioElems = function () {
    return this.__makeAudioElemsFromData(this.__sounds)
        .then(function (sounds) { return this.__sounds = sounds; }.bind(this));
};

/**
 * Makes audio elements from client data.
 * @param {Array} sounds
 * @returns {Promise}
 * @throws {Error}
 * @private
 */
Sounder.prototype.__makeAudioElemsFromData = function (sounds) {
    if (!Array.isArray(sounds)) throw new Error("Got incorrect data of sounds to make.");

    var
        preparedSounds = [], // Valid sounds data.
        promises = sounds.map(function (sound) {
            return this.__makeAudioElem(sound)
                .then(function (sound) { preparedSounds.push(sound); })
                .catch(function () { console.warn("Failed at making '" + sound.name + "' <audio> element."); });
        }.bind(this));

    return Promise.all(promises).then(function () { return preparedSounds; }.bind(this));
};

/**
 * Updates local prepared sounds data.
 * @param {Array} sounds Data of sounds to add to the instance.
 * @private
 */
Sounder.prototype.__updateSounds = function (sounds) {
    sounds.map(function (sound) { this.__sounds.push(sound); }.bind(this));
};

/**
 * Makes audio element.
 * @param {Object} sound Data of sound. Got from client side.
 * @return {Promise} Updated data of sound.
 * @private
 */
Sounder.prototype.__makeAudioElem = function (sound) {
    return new Promise(function (success, error) {
        if (this.__validateAudioElem(sound.audio)) return success(sound.audio);
        sound.audio = document.createElement("audio");
        this.__setAudioElemAttrs(sound);
        return this.__setAudioElemSource(sound)
            .then(function () { return success(sound); })
            .catch(function (e) { return error(e); });
    }.bind(this));
};

/**
 * Sets HTML attributes for audio element.
 * @param {Object} sound Data of sound. Defined by parameters got from client side.
 * @returns {Object} Updated data of sound.
 * @private
 */
Sounder.prototype.__setAudioElemAttrs = function (sound) {
    var audio = sound.audio;
    if (!(audio instanceof HTMLAudioElement)) throw new Error("Got incorrect <audio> element.");
    this.__attrs.forEach(function (attr) { this.__setAudioElemAttr(attr, sound); }.bind(this));
    return sound;
};

/**
 * Sets attribute for <audio> element.
 * @param {string} attr Name of attribute to set.
 * @param {Object} sound Data of sound. Dot from client side.
 * @returns {Object} Updated data of sound.
 * @private
 */
Sounder.prototype.__setAudioElemAttr = function (attr, sound) {
    this.validateAttrStrict(attr);
    this.__validateAudioElemStrict(sound.audio);
    var attrVal = this.__getAudioAttrVal(attr, sound);
    if (attrVal) sound.audio.setAttribute(attr, attrVal);
    return sound;
};

/**
 * Returns attribute value for <audio> element.
 * @param {string} attr Attribute name.
 * @param {Object} sound Data of sound. Got from client side.
 * @return {string} Valid value of attribute.
 * @private
 */
Sounder.prototype.__getAudioAttrVal = function (attr, sound) {
    this.validateAttrStrict(attr);
    return sound.hasOwnProperty(attr) ? sound[attr] : this["__" + attr];
};

/////////////////////////////////////////////////////////////////////////////////////

// Making sources for <audio> element.

/**
 * Sets sources for <audio> element.
 * Tries to make sources of sounds width all extensions browser support.
 * @param {Object} sound Sound data. Got from client side.
 * @return {Promise} Updated sound data.
 * @private
 */
Sounder.prototype.__setAudioElemSources = function (sound) {
    return new Promise(function (success, error) {
        sound.audio = this.__validateAudioElemStrict(sound.audio);

        return this.__getAvailableExts(sound.name)
            .then(function (exts) {
                if (!exts || !exts.length) return error(new Error("No available extensions of sound were found at server!"));
                exts.forEach(function (ext) {
                    sound.audio.appendChild(this.__makeAudioElemSource(sound.name, ext));
                }.bind(this));
                return success(sound);
            }.bind(this));
    }.bind(this));
};

/**
 * Sets source for <audio> element.
 * Tries to set source of single sound browser support.
 * @param {Object} sound Sound data. Got from client side.
 * @return {Promise} Updated sound data.
 * @private
 */
Sounder.prototype.__setAudioElemSource = function (sound) {
    return new Promise(function (success, error) {
        this.__validateAudioElemStrict(sound.audio);

        return this.__getAvailableExt(sound.name)
            .then(function (ext) {
                if (!ext) return error(new Error("No available extension of sound were found at server!"));
                sound.audio.appendChild(this.__makeAudioElemSource(sound.name, ext));
                return success(sound);
            }.bind(this));
    }.bind(this));
};

/**
 * Makes <source> element for <audio> element.
 * @param {string} name Name of sound.
 * @param {string} ext Extension of sound.
 * @return {HTMLSourceElement}
 * @private
 */
Sounder.prototype.__makeAudioElemSource = function (name, ext) {
    this.validateExtStrict(ext);
    var source = document.createElement("source");
    source.src = this.__getSoundPath(name, ext);
    source.setAttribute("type", "audio/" + ext);
    return source;
};

/////////////////////////////////////////////////////////////////////////////////////

// Looking for sounds at folder.

/**
 * Returns base path of sound (without extension).
 * @param {string} name
 * @return {string}
 * @private
 */
Sounder.prototype.__getSoundPathBase = function (name) {
    return this.__path + name +  ".";
};

/**
 * Returns path to sound.
 * @param {string} name Name of sound.
 * @param {string} ext Extension of sound.
 * @return {string} Path to sound.
 * @private
 */
Sounder.prototype.__getSoundPath = function (name, ext) {
    this.validateExtStrict(ext);
    return this.__getSoundPathBase(name) + ext;
};

/**
 * Returns available extensions for sound with this name.
 * Looks for sounds on the server side.
 * [BB: It is needed to overthink this method. Now it returns extensions browser support.]
 * @param {string} name Sound name.
 * @return {Promise<Array>} Available extensions.
 * @private
 */
Sounder.prototype.__getAvailableExts = function (name) {
    return new Promise(function (success, error) {
        if (!name) return error(new Error("Got incorrect sound name."));
        return success(this.__getBrowserExts());
    }.bind(this));
    // return new Promise(function (success) {
    //     var pathBase = this.__getSoundPathBase(name),
    //         exts = [],
    //         promises = this.__exts.all.map(function (ext) {
    //             return this.__soundExists(pathBase + ext)
    //                 .then(function (r) {
    //                     // console.log("Does sound '" + name + "' with extension '" + ext + "' exist?", r);
    //                     if (r) exts.push(ext);
    //                 });
    //         }.bind(this));
    //     return Promise.all(promises).then(function () { success(exts.sort()); });
    // }.bind(this));
};

/**
 * Returns first available extension for sound with this name.
 * @param {string} name Sound name.
 * @returns {Promise<string>}  Available extension.
 * @private
 */
Sounder.prototype.__getAvailableExt = function (name) {
    return this.__getAvailableExts(name)
        .then(function (exts) { return this.__getExtFromAvailableExts(exts); }.bind(this));
};

/**
 * Returns single audio extension from array of available extensions.
 * This method checks if browser can play extensions.
 * Returns first extension browser can play.
 * @param {Array} exts Available extensions to make choise of single extension.
 * @returns {string} Available audio extension.
 * @throws {Error}
 * @private
 */
Sounder.prototype.__getExtFromAvailableExts = function (exts) {
    if (!Array.isArray(exts)) throw new Error("Got incorrect array of available extensions.");
    if (!exts.length) throw new Error("There are no available extensions.");
    var i = 0, len = exts.length;
    for (i; i < len; i++) if (Sounder.__canPlayExt(exts[i])) return exts[i];
    throw new Error("Failed at looking for audio extension browser can play!");
};

/**
 * Says is sound exists.
 * @param {string} path Pat to the sound.
 * @return {Promise}
 * @private
 */
Sounder.prototype.__soundExists = function (path) {
    return new Promise(function (success) {
        if (!path) return succesS(false);
        var xhr = new XMLHttpRequest();
        xhr.open("HEAD", path, true);
        xhr.onloadend = function () {
            if (xhr.readyState !== 4) return;
            // console.log("Does sound '" + path + "' exist?", xhr.status === 200);
            return success(xhr.status === 200);
        };
        xhr.send();
    }.bind(this));
};

/////////////////////////////////////////////////////////////////////////////////////

/**
 * Looks for sound data in local storage.
 * @param {string} soundName
 * @return {Object}
 * @throws {Error}
 * @private
 */
Sounder.prototype.__getSoundData = function (soundName) {
    var sounds = this.__sounds, i = 0, len = sounds.length;
    for (i; i < len; i++) if (sounds[i].name === soundName) return sounds[i];
    throw new Error("Failed at looking for sound data with name '" + soundName + "'.");
};

/**
 * Returns name of current browser.
 * @return {string}
 * @private
 */
Sounder.prototype.__getBrowserName = function () {
    var nav = window.navigator,
        v = nav.vendor,
        ua = nav.userAgent,
        isOpera = function () { return /opera|opr/i.test(ua); };

    if (/chrome/i.test(ua) && /google inc\./i.test(v) && !isOpera()) return "chrome";
    if (/firefox/i.test(ua)) return "firefox";
    if (isOpera()) return "opera";
    if (/msie/i.test(ua)) return "explorer";
    if (/edge/i.test(ua)) return "edge";
    if (/Apple Computer, Inc\./i.test(v)) return "safari";

    return "";
};

/**
 * Returns available audio extensions for current browser.
 * @return {Array}
 * @private
 */
Sounder.prototype.__getBrowserExts = function () {
    var browserName = this.__getBrowserName();
    return this.__exts[browserName ? browserName : "all"];
};

/////////////////////////////////////////////////////////////////////////////////////
