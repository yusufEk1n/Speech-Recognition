URL = window.URL || window.webkitURL;

var gumStream;
var input;

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext

var recordButton = document.querySelector("#recordButton");
var stopButton = document.querySelector("#stopButton");
var recordStatus = document.querySelector("#recordStatus")

var intervalId;
var timeoutId;

var votes = [];

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

function startRecording() {

    recordButton.disabled = true;
    stopButton.disabled = false;


    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(function (stream) {

            audioContext = new AudioContext();
            gumStream = stream;
            input = audioContext.createMediaStreamSource(stream);

            intervalId = setInterval(async () => {
                const recorder = await recordAudio(input)
                await recorder.start();

                await sleep(500);

                await recorder.stop();
            }, 200)

        }).catch(function (err) {
            recordButton.disabled = false;
            stopButton.disabled = true;
            console.log(err)
        });
}

const sleep = time => new Promise(resolve => timeoutId = setTimeout(resolve, time));

const recordAudio = (input) =>
    new Promise(async resolve => {

        const recorder = new Recorder(input, { numChannels: 1 });

        const start = () => recorder.record();

        const stop = () =>
            new Promise(resolve => {
                recorder.stop();
                recorder.exportWAV(postToServer);
                resolve();
            });

        resolve({ start, stop });
    });

function postToServer(blob) {
    var url = URL.createObjectURL(blob);

    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onload = function () {
        audioContext.decodeAudioData(request.response, function (buffer) {
            var soundData = buffer.getChannelData(0);  // İlk kanalın ses verilerini alır (stereo ise 2. kanal için buffer.getChannelData(1) kullanılabilir)
            var rms = calcRMS(soundData);
            console.log('Ses şiddeti (RMS):', rms * 1000);

            if(votes.length >= 10)
            {
                console.log(votes);

                var modeMap = {};
                var maxEl = votes[0]; 
                var maxCount = 1;

                for(var i = 0; i < votes.length; i++)
                {
                    var el = votes[i];

                    if(modeMap[el] == null)
                    {
                        modeMap[el] = 1;
                    }
                    else
                    {
                        modeMap[el]++;  
                    }

                    if(modeMap[el] > maxCount)
                    {
                        maxEl = el;
                        maxCount = modeMap[el];
                    }
                }

                recordStatus.innerHTML = "Tahmin Edilen Konuşmacı: " + maxEl;
                votes = [];
            }

            if(rms * 1000 > 50) 
            {
                var xhr = new XMLHttpRequest();

                xhr.onload = function (e) {
                    if(this.readyState === 4) {
                        console.log("Server returned: ", e.target.responseText);

                        if(e.target.responseText)
                        {
                            var possibleVotes = JSON.parse(e.target.responseText);
                            for(var i = 0; i < possibleVotes.length; i++)
                            {
                                votes.push(possibleVotes[i]);
                            }
                        }
                    }
                }

                var fd = new FormData();
                fd.append("audio_data", blob, "filename.wav");

                xhr.open("POST", "/postSound", true);
                xhr.send(fd);
            }
        });
    }
    request.send();
}

function calcRMS(soundData) {
    var squares = soundData.map(function (x) { return x * x; });
    var avg = squares.reduce(function (a, b) { return a + b; }) / squares.length;
    var rms = Math.sqrt(avg);
    return rms;
}

function stopRecording() {
    recordButton.disabled = true;
    stopButton.disabled = true;

    recordStatus.innerHTML = "Kayıt İşlemi Durduruldu"
    inputName.disabled = false;

    gumStream.getAudioTracks()[0].stop();
    clearInterval(intervalId)
    clearTimeout(timeoutId)
}