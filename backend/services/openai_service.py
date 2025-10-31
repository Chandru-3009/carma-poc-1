"""OpenAI service client and utilities"""
from openai import OpenAI
from services.config import OPENAI_API_KEY

# Singleton OpenAI client
openai_client = OpenAI(api_key=OPENAI_API_KEY)

