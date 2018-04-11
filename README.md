# Sounder
JS class for working with sounds.

# Example
```javascript
// Make instance.
var sounder = Sounder.init({
    sounds: [
        { name: "sound-1", loop: true, volume: 1.0 },
        { name: "sound-2"}
    ],
    path: "/sounds/",
    preload: true,
    volume: 1.0
});

// Play sounds.
sounder.play("sound-1");
sounder.play("sound-2");
 
// Destruct instance after 5 seconds.
// Playing sounds will be stopped.
// Data of instance will be destructed.
setTimeout(sounder.destruct.bind(sounder), 5000);
```
