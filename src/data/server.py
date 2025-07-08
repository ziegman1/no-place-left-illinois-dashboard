from flask import Flask, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

@app.route('/api/counties', methods=['GET'])
def get_counties():
    geojson_path = os.path.join(os.path.dirname(__file__), 'il_counties.geojson')
    with open(geojson_path) as f:
        data = json.load(f)
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
