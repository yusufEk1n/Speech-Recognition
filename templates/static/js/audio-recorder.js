URL = window.URL || window.webkitURL;

var gumStream;
var input;

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext

var recordButton = document.querySelector("#recordButton");
var stopButton = document.querySelector("#stopButton");
var inputName = document.querySelector("#inputName")
var recordStatus = document.querySelector("#recordStatus")

var intervalId;
var timeoutId;

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

inputName.addEventListener("input", function () {
    if (inputName.value == "") {
        recordButton.disabled = true;
    } else {
        recordButton.disabled = false;
    }
})

function startRecording() {

    var name = inputName.value
    inputName.value = ""
    inputName.disabled = true;

    recordButton.disabled = true;
    stopButton.disabled = false;


    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(function (stream) {

            audioContext = new AudioContext();
            gumStream = stream;
            input = audioContext.createMediaStreamSource(stream);
            recordStatus.innerHTML = "Kayıt Başlamak Üzere..."
            
            
            intervalId = setInterval(function () {
                recordStatus.innerHTML = "Kayıt Ediliyor..."
                const recorder = new Recorder(input, { numChannels: 1 })
                recorder.record()

                sleep(10000).then(() => {
                    recorder.stop()
                    recorder.exportWAV(function (blob) {
                        var filename = name + "-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + ".wav";
                        var formData = new FormData();
                        formData.append("audio_data", blob, filename);
                        console.log(filename)
                        
                        var request = new XMLHttpRequest();
                        request.open("POST", "/recordAudio", true);
                        request.send(formData);
                        recordStatus.innerHTML = "Kayıt Edildi"
                    });
                })
            }, 11000)

        }).catch(function (err) {
            recordButton.disabled = false;
            stopButton.disabled = true;
            console.log(err)
        });
}

const sleep = time => new Promise(resolve => timeoutId = setTimeout(resolve, time));

function stopRecording() {

    recordButton.disabled = true;
    stopButton.disabled = true;

    recordStatus.innerHTML = "Kayıt İşlemi Durduruldu"
    inputName.disabled = false;

    gumStream.getAudioTracks()[0].stop();
    clearInterval(intervalId)
    clearTimeout(timeoutId)
}