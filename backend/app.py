from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import logging
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
from pdf_processor import PDFProcessor
from ai_service import AIService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
MAX_CONTENT_LENGTH = 4 * 1024 * 1024  # 4MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize services
pdf_processor = PDFProcessor()
ai_service = AIService()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Study Notes Generator API is running'})

@app.route('/api/process-pdf', methods=['POST'])
def process_pdf():
    try:
        # Check if file is present in request
        if 'pdf' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['pdf']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check if file is allowed
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only PDF files are allowed'}), 400
        
        
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Save uploaded file
        file.save(filepath)
        logger.info(f"File uploaded: {filepath}")
        
        try:
            # Extract text from PDF
            logger.info("Extracting text from PDF...")
            text_content = pdf_processor.extract_text(filepath)
            
            if not text_content.strip():
                return jsonify({'error': 'No text could be extracted from the PDF'}), 400
            
            # Generate study materials using AI
            logger.info("Generating study materials...")
            study_materials = ai_service.generate_study_materials(text_content)
            
            logger.info("Study materials generated successfully")
            return jsonify(study_materials)
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            return jsonify({'error': f'Failed to process PDF: {str(e)}'}), 500
            
        finally:
            # Clean up uploaded file
            try:
                os.remove(filepath)
                logger.info(f"Cleaned up file: {filepath}")
            except Exception as e:
                logger.warning(f"Failed to clean up file {filepath}: {str(e)}")
                
    except RequestEntityTooLarge as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500


@app.route('/api/query', methods=['POST'])
def query_pdf():
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400

        user_message = data['message']
        response = ai_service.query_response(user_message)
        return jsonify({'response': response}), 200

    except Exception as e:
        logger.error(f"Error in query endpoint: {str(e)}")
        return jsonify({'error': 'Failed to get response'}), 500


@app.errorhandler(RequestEntityTooLarge)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 4MB'}), 413

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)