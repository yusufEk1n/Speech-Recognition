from flask import Flask, render_template
import os

app = Flask(__name__)
app.static_folder = os.path.abspath(path="templates/static/")

@app.route("/", methods=["GET"])
def index():
    return render_template("layouts/index.html")
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  

