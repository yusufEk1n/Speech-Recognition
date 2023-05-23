import os
from flask import Flask, request, jsonify, render_template
import librosa
import pickle
import numpy as np
import io
import pandas as pd
from collections import Counter


app = Flask(__name__)
app.static_folder = os.path.abspath(path="templates/static/")

model = None

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


@app.route("/saveAudio", methods=['POST', 'GET'])
def saveAudio():
    try:
        audio_data = request.files['audio_data']
        filename = audio_data.filename
        name = filename.split('-')[0]

        if not os.path.exists(os.path.join('ML', 'training_set')):
            os.makedirs(os.path.join('ML', 'training_set'))

        if not os.path.exists(os.path.join('ML', 'training_set', name)):
            os.makedirs(os.path.join('ML', 'training_set', name))

        WAVE_PATH = os.path.join('ML', 'training_set', name, filename)

        trainedfilelist = open(os.path.join('ML', 'trainedfilelist.txt'), 'a')
        trainedfilelist.write(WAVE_PATH + '\n')
        trainedfilelist.close()

        audio_data.save(WAVE_PATH)

        return jsonify({'message': 'success'})

    except Exception as e:
        return jsonify({'error': str(e)})


@app.route("/postSound", methods=['POST', 'GET'])
def postSound():
    try:
        if model is not None:
            f = request.files['audio_data']
            filename = f.filename

            features = []
            audio, rate = librosa.load(f)

            y_trimmed, _ = librosa.effects.trim(audio, top_db=20)

            if len(y_trimmed) < 4410:
                return jsonify("")

            # ses dosyasını 200 milisaniyelik parçalara böl
            # her bir parçadan mfcc çıkar
            for i in range(0, len(y_trimmed), 4410):
                if i+4410 < len(y_trimmed):
                    comph_mfccs = feature_extraction(y_trimmed[i:i+4410], rate)
                    features.append(comph_mfccs)

            features = np.array(features).reshape(len(features), -1)

            result = model.predict(features)

            result = Counter(result).most_common(1)[0][0]

            return jsonify({'result': result})
        else:
            return jsonify({'error': 'error'})
    except Exception as e:
        return jsonify({'error': str(e)})

def feature_extraction(audio, rate):
    mfccs = librosa.feature.mfcc(y=audio, sr=rate, n_mfcc=13)
    delta_mfccs = librosa.feature.delta(mfccs)
    delta2_mfccs = librosa.feature.delta(mfccs, order=2)
    comph_mfccs = np.concatenate((mfccs, delta_mfccs, delta2_mfccs))
    return comph_mfccs
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)  