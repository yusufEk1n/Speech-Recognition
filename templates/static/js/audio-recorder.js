URL = window.URL || window.webkitURL;

var gumStream;
var input;

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext;

var recordButton = document.querySelector("#recordButton");
var stopButton = document.querySelector("#stopButton");
var inputName = document.querySelector("#inputName");
var recordStatus = document.querySelector("#recordStatus");

var intervalId;
var timeoutId;
var myName;

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

/*
    * Bu event listener ile inputName alanı boş ise butonu pasif değilse aktif hale getiriyoruz.
*/
inputName.addEventListener("input", function () {
    recordButton.disabled = inputName.value == "";
})

/*
    * Bu fonksyion kayıt işlemini başlatır.
    * Kayıt edilen ses dosyası server'a gönderilir.
    * Her kayıt sürüsü 10 saniyedir.
*/
function startRecording() 
{
    myName = inputName.value;
    inputName.value = "";
    inputName.disabled = true;

    changeEnable();

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(function (stream) {
            
            // ses kaydı için gerekli değişkenler tanımlanıyor.
            audioContext = new AudioContext();
            gumStream = stream;
            input = audioContext.createMediaStreamSource(stream);
            recordStatus.innerHTML = "Kayıt Başlamak Üzere...";
            
            // 10 saniyede bir tekrar eden fonksiyon ile kayıt işlemi gerçekleştiriliyor.
            intervalId = setInterval(function () {
                recordStatus.innerHTML = "Kayıt Ediliyor...";
                const recorder = new Recorder(input, { numChannels: 1 });
                recorder.record();

                // 10 saniye sonra kayıt işlemi durduruluyor ve postToServer fonksiyonu ile server'a gönderiliyor.
                sleep(10000).then(() => {
                    recorder.stop();
                    recorder.exportWAV(postToServer);
                })
            }, 11000)

        }).catch(function (err) {
            recordButton.disabled = false;
            stopButton.disabled = true;
            console.log(err);
        });
}

// Bu fonksiyon ile belirtilen süre kadar beklenir.
const sleep = time => new Promise(resolve => timeoutId = setTimeout(resolve, time));

/*
 * Bu fonksiyon kayıt işlemini durdurur.
 * Kayıt işlemi için kullanılan tüm değişkenler sıfırlanır.
*/
function stopRecording() 
{
    recordButton.disabled = true;
    stopButton.disabled = true;

    recordStatus.innerHTML = "Kayıt İşlemi Durduruldu";
    inputName.disabled = false;

    gumStream.getAudioTracks()[0].stop();
    clearInterval(intervalId);
    clearTimeout(timeoutId);
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
    * Bu fonksiyon ile rastgele bir isim ile kayıt edilen ses dosyası server'a gönderilir.
*/
function postToServer(blob)
{
    // kayıt edilen ses dosyası için girilen isim ile başlayan unique bir isim oluşturuluyor.
    var filename = myName + "-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + ".wav";

    // Server'a gönderilecek form oluşturuluyor.
    var formData = new FormData();

    // form'a kayıt edilen ses dosyası ekleniyor.
    formData.append("audio_data", blob, filename);

    // Server'a form gönderiliyor.
    var request = new XMLHttpRequest();
    request.open("POST", "/saveAudio", true);
    request.send(formData);
    recordStatus.innerHTML = "Kayıt Edildi";
}