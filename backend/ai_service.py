import os
import logging
from dotenv import load_dotenv
from typing import Dict, List, Any
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import RetrievalQA
import uuid

load_dotenv()

class AIService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.together_api_key = os.getenv('GOOGLE_API_KEY')
        
        if not self.together_api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        
        # Initialize embeddings (free HuggingFace model)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'}
        )
        
        # Initialize Together LLM
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",  # or gemini-1.5-pro
            temperature=0.3,
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )

        
        # Text splitter for chunking
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
    
    def create_vector_store(self, text: str) -> FAISS:
        """
        Create a vector store from the input text for RAG.
        
        Args:
            text (str): Input text to vectorize
            
        Returns:
            FAISS: Vector store for retrieval
        """
        try:
            # Split text into chunks
            texts = self.text_splitter.split_text(text)
            self.logger.info(f"Split text into {len(texts)} chunks")
            
            # Create vector store
            vector_store = FAISS.from_texts(texts, self.embeddings)
            self.logger.info("Vector store created successfully")
            self.vectorStore = vector_store
            return vector_store
            
        except Exception as e:
            self.logger.error(f"Error creating vector store: {str(e)}")
            raise
    

    def generate_summary(self, text: str) -> str:
        try:
            vector_store = self.create_vector_store(text)
            
            # Create retrieval QA chain
            qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=vector_store.as_retriever(search_kwargs={"k": 3}),
                return_source_documents=False
            )
            
            prompt = """
            Based on the provided text, create a comprehensive summary that captures the main ideas, 
            key concepts, and important details. The summary should be well-structured and easy to understand.
            
            Please provide a summary that:
            1. Highlights the most important points
            2. Maintains logical flow
            3. Is concise but comprehensive
            4. Uses clear language
            """
            
            result = qa_chain.run(prompt.format(text=text[:2000]))  # Limit input length
            return result.strip()
            
        except Exception as e:
            self.logger.error(f"Error generating summary: {str(e)}")
            return "Failed to generate summary. Please try again."
    

    def generate_notes(self, text: str) -> List[str]:
        try:
            vector_store = self.vectorStore
            
            qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
                return_source_documents=False
            )
            
            prompt = """
            Extract the most important key points and concepts from the provided text. 
            Present them as a list of concise, well-structured notes.
            
            Each note should:
            1. Capture a single important concept or idea
            2. Be clear and easy to understand
            3. Be actionable for studying
            4. Be specific and informative
            
            Provide 5-10 key notes from this text.
            Format each note as a complete sentence or phrase.
            """
            
            result = qa_chain.run(prompt)
            
            # Parse the result into individual notes
            notes = []
            lines = result.strip().split('\n')
            
            for line in lines:
                line = line.strip()
                # Remove bullet points, numbers, etc.
                clean_line = line.lstrip('•-*1234567890. ')
                if clean_line and len(clean_line) > 10:
                    notes.append(clean_line)
            
            return notes[:10]  # Limit to 10 notes
            
        except Exception as e:
            self.logger.error(f"Error generating notes: {str(e)}")
            return ["Failed to generate notes. Please try again."]
    

    def generate_flashcards(self, text: str) -> List[Dict[str, str]]:
        try:
            vector_store = self.vectorStore
            
            qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
                return_source_documents=False
            )
            
            prompt = """
            Create study flashcards from the provided text. Each flashcard should have a clear question 
            and a comprehensive answer.
            
            Generate 5-8 flashcards that:
            1. Test understanding of key concepts
            2. Have clear, specific questions
            3. Have detailed, accurate answers
            4. Cover different aspects of the material
            
            Format each flashcard as:
            Q: [Question]
            A: [Answer]
            
            Separate each flashcard with a blank line.
            """
            
            result = qa_chain.run(prompt)
            
            # Parse flashcards from the result
            flashcards = []
            current_question = ""
            current_answer = ""
            
            lines = result.strip().split('\n')
            
            for line in lines:
                line = line.strip()
                if line.startswith('Q:'):
                    # Save previous flashcard if exists
                    if current_question and current_answer:
                        flashcards.append({
                            'id': str(uuid.uuid4()),
                            'question': current_question,
                            'answer': current_answer
                        })
                    
                    current_question = line[2:].strip()
                    current_answer = ""
                    
                elif line.startswith('A:'):
                    current_answer = line[2:].strip()
                    
                elif line and current_answer:
                    # Continue answer on new line
                    current_answer += " " + line
            
            # Add the last flashcard
            if current_question and current_answer:
                flashcards.append({
                    'id': str(uuid.uuid4()),
                    'question': current_question,
                    'answer': current_answer
                })
            
            return flashcards[:8]  # Limit to 8 flashcards
            
        except Exception as e:
            self.logger.error(f"Error generating flashcards: {str(e)}")
            return [{
                'id': str(uuid.uuid4()),
                'question': 'Error generating flashcards',
                'answer': 'Please try again with a different document.'
            }]
    

    def generate_study_materials(self, text: str) -> Dict[str, Any]:
        """
        Generate complete study materials including summary, notes, and flashcards.
        
        Args:
            text (str): Input text to process
            
        Returns:
            Dict[str, Any]: Complete study materials
        """
        try:
            self.logger.info("Starting study materials generation...")
            
            vector_store = self.create_vector_store(text)
            # Generate all materials
            summary = self.generate_summary(text)
            notes = self.generate_notes(text)
            flashcards = self.generate_flashcards(text)
            
            study_materials = {
                'summary': summary,
                'notes': notes,
                'flashcards': flashcards
            }
            
            self.logger.info("Study materials generated successfully")
            return study_materials
            
        except Exception as e:
            self.logger.error(f"Error generating study materials: {str(e)}")
            return {
                'summary': 'Failed to generate summary.',
                'notes': ['Failed to generate notes.'],
                'flashcards': [{
                    'id': str(uuid.uuid4()),
                    'question': 'Error occurred',
                    'answer': 'Please try again.'
                }]
            }

    def query_response(self, text: str) :
        try :
            vector_store = self.vectorStore
            
            qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
                return_source_documents=False
            )

            result = qa_chain(text)
            return result

        except Exception as e:
            self.logger.error(f"Error generating flashcards: {str(e)}")
            return [{
                'id': str(uuid.uuid4()),
                'message' : "Something went wrong"
            }]