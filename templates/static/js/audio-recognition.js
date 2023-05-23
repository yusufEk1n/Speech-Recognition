URL = window.URL || window.webkitURL;

var gumStream;
var input;

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext;

var recordButton = document.querySelector("#recordButton");
var stopButton = document.querySelector("#stopButton");
var recordStatus = document.querySelector("#recordStatus");
var text = document.querySelector("#text");

var model = false;

var recognition;
var recorder;

var prediction = "";

/*
    * Bu event listener ile kayıt butonuna basıldığında kayıt işlemi başlar.
    * Kayıt edilen ses dosyası metne çevrilir.
    * Kayıt edilen ses dosyası tanınması için server'a gönderilir.
*/
recordButton.addEventListener("click", function () {

    if (model == true) // Model yüklü ise
    {
        changeEnable();

        // Kayıt için izin istenir.
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(function (stream) {
                
                // Bu değşken kelime sayısını kontrol etmek için kullanılıyor.
                var tempWordCount = 0;

                // Bu değişken kelime sayısını tutmak için kullanılıyor.
                var wordLength = 0;

                // Ses kaydı için gerekli değişkenler tanımlanıyor.
                audioContext = new AudioContext();
                gumStream = stream;
                input = audioContext.createMediaStreamSource(stream);

                // Sesi kayıt etmek için ve Sesi metne çevirmek için kullanılan değişken tanımlanıyor.
                recorder = new Recorder(input, { numChannels: 1 });
                recognition = new webkitSpeechRecognition();
                
                // Türkçe tanıma yapılması için dil ayarı yapılıyor.
                recognition.lang = "tr-TR";

                recognition.onresult = function (event) {

                    // Konuşma metne çevrilir ve text alanına yazılır.
                    var recognizedText = event.results[0][0].transcript;
                    text.innerHTML = recognizedText;

                    wordLength = text.innerHTML.split(" ").length;
                    
                    // Konuşmacının konuştuğu cümle boyunca ses dosyalarını server'a göndermek için kullanılıyor.
                    if(wordLength > tempWordCount)
                    {
                        recorder.exportWAV(function (blob) {
                            postToServer(blob);
                        });

                        tempWordCount = wordLength;
                    }
                };
                
                recognition.onstart = function () {
                    recognition.interimResults = true; // Konuşma metnini anlık olarak kelime kelime almak için ayar yapılıyor.
                };
                
                recognition.onerror = function (event) {
                    if(String(event.error) == "no-speech") // Konuşma algılanamadığında
                    {
                        recordStatus.innerHTML = "Konuşma algılanamadı.";
                    }
                };

                recognition.onend = function () {
                    // Konuşma bittiğinde kayıt işlemi tekrar başlatılıyor.
                    recognition.start();

                    recorder.clear();
                    recorder.record();

                    tempWordCount = 0;
                };

                recognition.start();
                recorder.record();
            })
            .catch(function (err) {
                recordButton.disabled = false;
                stopButton.disabled = true;
                console.log(err);
            });
    }
    else 
    {
        recordStatus.innerHTML = "Model yüklenemedi.";

        sleep(1500).then(() => {
            recordStatus.innerHTML = "...";
        });
    }
});

/*
    * Bu event listener ile durdur butonuna basıldığında kayıt işlemi durdurulur.
    * Kayıt için gerekli değişkenler null değerine atanır.
*/
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

    recordStatus.innerHTML = "...";
    text.innerHTML = "...";
});

// Bu fonksiyon ile belirtilen süre kadar beklenir.
const sleep = time => new Promise(resolve => timeoutId = setTimeout(resolve, time));

/*
    * Bu fonksiyon ile sayfa yüklendiğinde model yüklü mü kontrolü yapılır.
*/
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

/*
    * Bu fonksiyon ile kayıt ve durdur butonlarının aktiflik durumu değiştirilir.
*/
function changeEnable() 
{
    recordButton.disabled = !recordButton.disabled;
    stopButton.disabled = !stopButton.disabled;
}

/*
    * Bu fonksiyon ile kayıt edilen ses dosyası server'a gönderilir.
    * Server'dan dönen tahmin edilen konuşmacı adı recordStatus alanına yazılır.
*/
function postToServer(blob) {
    var xhr = new XMLHttpRequest();

    // Server'dan dönen cevap alındığında yapılacak işlemler.
    xhr.onload = function (e) {
        if (this.readyState === 4) // cevap başarılı ise
        { 
            // Cevap json formatında olduğu için parse edilir ve recordStatus alanına yazılır.
            var data = JSON.parse(e.target.responseText);
            prediction = data["result"];
            recordStatus.innerHTML = "Tahmin Edilen Konuşmacı: " + prediction
        }
    }

    // Server'a gönderilecek form oluşturuluyor.
    var fd = new FormData();

    // Form'a kayıt edilen ses dosyası ekleniyor.
    fd.append("audio_data", blob, "filename.wav");

    // Server'a post işlemi yapılıyor.
    xhr.open("POST", "/postSound", true);
    xhr.send(fd);
}