URL = window.URL || window.webkitURL;

var gumStream;
var input;

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext

var recordButton = document.querySelector("#recordButton");
var stopButton = document.querySelector("#stopButton");
var recordStatus = document.querySelector("#recordStatus")
var text = document.querySelector("#text")

var model = false;

var recognition;
var recorder;

recordButton.addEventListener("click", function () {

    if (model == true) {
        changeEnable();
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(function (stream) {

                var isRead = false;

                audioContext = new AudioContext();
                gumStream = stream;
                input = audioContext.createMediaStreamSource(stream);

                recorder = new Recorder(input, { numChannels: 1 })

                recognition = new webkitSpeechRecognition();
                recognition.lang = "tr-TR";

                recognition.onresult = function (event) {
                    var recognizedText = event.results[0][0].transcript;
                    text.innerHTML = recognizedText;

                    if (recognizedText.split(" ").length > 1 && isRead == false) {
                        isRead = true;
                        recorder.stop()
                        recorder.exportWAV(postToServer)
                    }
                };

                recognition.onstart = function () {
                    isRead = false;
                    recognition.interimResults = true;
                };

                recognition.onend = function () {
                    isRead = false;
                    recognition.start();

                    recorder = new Recorder(input, { numChannels: 1 })
                    recorder.record()
                };

                recognition.start();
                recorder.record()
            })
            .catch(function (err) {
                recordButton.disabled = false;
                stopButton.disabled = true;
                console.log(err);
            });
    }
    else {
        recordStatus.innerHTML = "Model yüklenemedi."

        sleep(1500).then(() => {
            recordStatus.innerHTML = "..."
        });
    }
});


stopButton.addEventListener("click", function () {

    changeEnable();

    if (gumStream)
    {
        gumStream.getAudioTracks()[0].stop();
        gumStream = null;
    }

    if (recorder)
    {
        recorder.stop();
        recorder = null;
    }

    if (recognition)
    {
        recognition.stop();
        recognition = null;
    }

    recordStatus.innerHTML = "..."
    text.innerHTML = "..."
});


const sleep = time => new Promise(resolve => timeoutId = setTimeout(resolve, time));

window.onload = function () {
    $.ajax({
        url: "/modelIsThere",
        type: "GET",
        success: function (response) {
            (response.message == 'success') ? model = true : model = false
        },
        error: function (err) {
            console.log(err);
        }
    });
}


function changeEnable() {
    recordButton.disabled = !recordButton.disabled;
    stopButton.disabled = !stopButton.disabled;
}

function postToServer(blob) {
    var xhr = new XMLHttpRequest();
    
    xhr.onload = function (e) {
        if (this.readyState === 4) {
            var data = JSON.parse(e.target.responseText);
            recordStatus.innerHTML = "Tahmin Edilen Konuşmacı: " + data["result"];
        }
    }

    var fd = new FormData();
    fd.append("audio_data", blob, "filename.wav");
    xhr.open("POST", "/postSound", true);
    xhr.send(fd);
}