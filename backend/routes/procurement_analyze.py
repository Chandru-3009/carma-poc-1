"""Procurement analysis routes"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from services.openai_service import openai_client
from services.config import DATA_DIR, OUTPUT_DIR
import json
import pandas as pd
from pathlib import Path

router = APIRouter(
    prefix="/api",
    tags=["Procurement Analysis"]
)


def get_procurement_attachments_dir():
    """Get the attachments directory path"""
    return DATA_DIR / "attachments"


@router.post("/procurement/analyze")
def analyze_procurement_logs():
    """
    Analyze all procurement log Excel attachments using AI.
    Classify vendors as Complete, Partial, or Incomplete.
    """
    attachments_dir = get_procurement_attachments_dir()
    
    # Step 1: Find all Excel files
    excel_files = list(attachments_dir.glob("*.xlsx"))
    
    if not excel_files:
        raise HTTPException(
            status_code=404,
            detail="No Excel files (.xlsx) found in /data/attachments/"
        )
    
    # Step 2: Parse all Excel files
    parsed_data = []
    for file in excel_files:
        try:
            df = pd.read_excel(file)
            df = df.fillna("")  # Replace NaN with empty string
            df = df.replace({None: ""})  # Replace None with empty string
            
            # Convert datetime/timestamp columns to strings for JSON serialization
            for col in df.columns:
                if pd.api.types.is_datetime64_any_dtype(df[col]):
                    df[col] = df[col].astype(str)
            
            parsed_data.append({
                "filename": file.name,
                "row_count": len(df),
                "columns": list(df.columns),
                "records": df.to_dict(orient="records")[:50]  # Limit to first 50 rows for AI processing
            })
        except Exception as e:
            print(f"Error reading {file.name}: {str(e)}")
            # Continue processing other files
    
    if not parsed_data:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse any Excel files"
        )
    
    # Step 3: Prepare AI prompt with few-shot examples
    system_prompt = """You are an AI Procurement Data Analyst specializing in construction project procurement.
Analyze vendor records from Excel files and classify their completeness.
Think step-by-step, but output only valid JSON matching the schema."""

    few_shot_example = """EXAMPLE OUTPUT:
{
  "vendors": [
    {
      "vendor_name": "ABC Electrical",
      "completeness": "Complete",
      "missing_fields": [],
      "remarks": "All required fields filled correctly."
    },
    {
      "vendor_name": "Summit HVAC",
      "completeness": "Partial",
      "missing_fields": ["Delivery Date", "Lead Time"],
      "remarks": "Missing critical delivery information for 2 items."
    },
    {
      "vendor_name": "Elite Millwork",
      "completeness": "Incomplete",
      "missing_fields": ["Item Description", "Lead Time", "Status", "Contact"],
      "remarks": "Incomplete record – missing multiple critical fields."
    }
  ],
  "ai_metadata": {
    "total_vendors": 3,
    "complete": 1,
    "partial": 1,
    "incomplete": 1,
    "confidence_score": 0.91
  }
}"""

    user_prompt = f"""PROCUREMENT DATA FROM EXCEL FILES:
{json.dumps(parsed_data, indent=2)[:15000]}...

TASK:
1. Analyze each vendor record from the Excel data
2. Classify completeness as: Complete, Partial, or Incomplete
3. Identify missing fields for each vendor
4. Provide remarks explaining the classification
5. Return summary statistics

{few_shot_example}

NOW ANALYZE THE PROVIDED DATA AND OUTPUT JSON:"""

    # Step 4: Call OpenAI API
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=2000
        )
        
        ai_response = response.choices[0].message.content
        
        # Parse AI response
        try:
            clean_response = ai_response.strip()
            # Remove markdown code blocks if present
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            ai_output = json.loads(clean_response)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse AI response: {str(e)}\nAI Response: {ai_response[:500]}"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI API error: {str(e)}"
        )
    
    # Step 5: Save results
    output_file = OUTPUT_DIR / "procurement_analysis.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "input_files": [f["filename"] for f in parsed_data],
            "analyzed_at": pd.Timestamp.now().isoformat(),
            "analysis": ai_output
        }, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Procurement analysis saved to: {output_file}")
    print(f"📊 Classified {ai_output.get('ai_metadata', {}).get('total_vendors', 0)} vendors")
    
    # Step 6: Return results
    return JSONResponse({
        "status": "success",
        "file_saved": str(output_file),
        "files_analyzed": len(excel_files),
        "result": ai_output
    })

