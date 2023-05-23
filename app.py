import os
from flask import Flask, request, jsonify, render_template
import librosa
import pickle
import numpy as np
import io
import pandas as pd
from collections import Counter


app = Flask(__name__)

# templates/static/ dizinini statik dosyaların bulunduğu dizin olarak belirle
app.static_folder = os.path.abspath(path="templates/static/")

model = None

# Eğer eğitilmiş model varsa yükle
if os.path.exists(os.path.join('ML', 'training_models', 'finalized_model.sav')):
    model = pickle.load(open(os.path.join('ML', 'training_models', 'finalized_model.sav'), 'rb'))


@app.route("/", methods=["GET"])
def index():
    return render_template("layouts/index.html")

@app.route("/recorder", methods=["GET"])
def recorder():
    return render_template("layouts/recorder.html")

@app.route("/talk", methods=["GET"])
def talk():
    return render_template("layouts/talk.html")

@app.route("/modelIsThere", methods=["GET"])
def modelIsThere():
    if model is not None:
        return jsonify({'message': 'success'})
    else:
        return jsonify({'message': 'error'})

'''
>>> Açıklama
>>> --------
>>> Bu endpoint, eğitilmek üzere gönderilen ses dosyalarını kaydeder.
'''
@app.route("/saveAudio", methods=['POST', 'GET'])
def saveAudio():
    try:
        audio_data = request.files['audio_data']

        # gelen ses dosyasından isim bilgisini al
        filename = audio_data.filename
        name = filename.split('-')[0]

        # eğer ML dizini yoksa oluştur
        if not os.path.exists(os.path.join('ML', 'training_set')):
            os.makedirs(os.path.join('ML', 'training_set'))

        # eğer böyle bir isimde klasör yoksa oluştur
        if not os.path.exists(os.path.join('ML', 'training_set', name)):
            os.makedirs(os.path.join('ML', 'training_set', name))

        # ses dosyasının kaydedileceği yol
        WAVE_PATH = os.path.join('ML', 'training_set', name, filename)

        # bu ses dosyasının yolunu trainedfilelist.txt dosyasına kaydet
        trainedfilelist = open(os.path.join('ML', 'trainedfilelist.txt'), 'a')
        trainedfilelist.write(WAVE_PATH + '\n')
        trainedfilelist.close()

        # ses dosyasını WAVE_PATH yoluna kaydet
        audio_data.save(WAVE_PATH)

        return jsonify({'message': 'success'})

    except Exception as e:
        return jsonify({'error': str(e)})


'''
>>> Açıklama
>>> --------
>>> Bu endpoint, tahmin edilmek üzere gönderilen ses dosyasını model üzerinden tahmin eder.
'''
@app.route("/postSound", methods=['POST', 'GET'])
def postSound():
    try:
        if model is not None:
            f = request.files['audio_data']
            filename = f.filename

            features = []

            # ses dosyasını yükle
            audio, rate = librosa.load(f)

            # ses dosyasının başındaki ve sonundaki boşlukları kaldır
            y_trimmed, _ = librosa.effects.trim(audio, top_db=20)

            # ses dosyası çok kısa ise tahmin etme
            if len(y_trimmed) < 4410:
                return jsonify("")

            # ses dosyasını 200 milisaniyelik parçalara böl
            # her bir parçadan mfcc çıkar
            for i in range(0, len(y_trimmed), 4410):
                if i+4410 < len(y_trimmed):
                    comph_mfccs = feature_extraction(y_trimmed[i:i+4410], rate)
                    features.append(comph_mfccs)

            # çıkarılan mfcc'leri numpy dizisine çevir ve tahmin edilmeye hazır hale getir                        
            features = np.array(features).reshape(len(features), -1)

            # tahmin et
            result = model.predict(features)

            # olası ihtimalleri say ve en çok olanı döndür
            result = Counter(result).most_common(1)[0][0]

            return jsonify({'result': result})
        else:
            return jsonify({'error': 'error'})
    except Exception as e:
        return jsonify({'error': str(e)})

'''
>>> Açıklama
>>> --------
>>> Bu fonksiyon ile ses dosyalarından öznitelik çıkarılır.
>>> Öznitelik çıkarımı için MFCC kullanılır.
>>> MFCC'lerin delta ve delta2'leri de hesaplanır.
>>> Son olarak bu değerler birleştirilir ve geri döndürülür.
'''
def feature_extraction(audio, rate):
    mfccs = librosa.feature.mfcc(y=audio, sr=rate, n_mfcc=13)
    delta_mfccs = librosa.feature.delta(mfccs)
    delta2_mfccs = librosa.feature.delta(mfccs, order=2)
    comph_mfccs = np.concatenate((mfccs, delta_mfccs, delta2_mfccs))
    return comph_mfccs
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)  