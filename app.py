import os
from flask import Flask, request, jsonify, render_template
import librosa
import pickle
import numpy as np
import io
import pandas as pd


app = Flask(__name__)
app.static_folder = os.path.abspath(path="templates/static/")

@app.route("/", methods=["GET"])
def index():
    return render_template("layouts/index.html")

@app.route("/recorder", methods=["GET"])
def recorder():
    return render_template("layouts/recorder.html")


@app.route("/saveAudio", methods=['POST', 'GET'])
def saveAudio():
    try:
        audio_data = request.files['audio_data']
        filename = audio_data.filename
        name = filename.split('-')[0]

        if not os.path.exists('training_set'):
            os.makedirs('training_set')

        if not os.path.exists(os.path.join('training_set', name)):
            os.makedirs(os.path.join('training_set', name))

        WAVE_PATH = os.path.join('training_set', name, filename)

        trainedfilelist = open('trainedfilelist.txt', 'a')
        trainedfilelist.write(WAVE_PATH + '\n')
        trainedfilelist.close()

        audio_data.save(WAVE_PATH)

        return jsonify({'message': 'success'})

    except Exception as e:
        return jsonify({'error': str(e)})
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  



