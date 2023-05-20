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


@app.route("/recordAudio", methods=['POST', 'GET'])
def recordAudio():
    f = request.files['audio_data']
    filename = f.filename

    print(filename)

    return jsonify({'message': 'ses kaydedildi'})

    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  

