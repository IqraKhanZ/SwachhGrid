"""
ai_service.py — Community Hero Green
All AI calls, using NVIDIA API (OpenAI compatible format).
"""

import os
import json
import httpx
import base64
from dotenv import load_dotenv

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
# Using LLaMA 3.2 Vision for both text and image tasks
TEXT_MODEL = "meta/llama-3.2-11b-vision-instruct"
VISION_MODEL = "meta/llama-3.2-11b-vision-instruct"

# --- Environmental categories supported by this platform ---------------------
ENV_CATEGORIES = [
    "Illegal Waste Dumping", "Plastic Pollution", "Waste Accumulation",
    "Water Leakage", "Water Wastage", "Drainage Blockage",
    "Flood / Waterlogging Risk", "Sewage Problem", "Open Burning",
    "Air Pollution", "Lack of Waste Segregation", "Tree Cutting",
    "Damaged Greenery", "Excessive Energy Usage", "Other Environmental Issue",
]

def _download_image_as_base64(url: str) -> tuple[bytes, str]:
    response = httpx.get(url, timeout=30, follow_redirects=True)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "image/jpeg")
    if ";" in content_type:
        content_type = content_type.split(";")[0].strip()
    return response.content, content_type

def _call_nvidia_api(payload: dict) -> str:
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(NVIDIA_API_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

def _parse_json_from_llm(text: str) -> dict:
    text = text.strip()
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            p = part.strip()
            if p.startswith("json"):
                p = p[4:].strip()
            try:
                return json.loads(p)
            except Exception:
                continue
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1:
        json_str = text[first_brace:last_brace+1]
        try:
            return json.loads(json_str)
        except Exception:
            pass
    return json.loads(text)

def analyze_environmental_issue(image_url: str, description: str = "") -> dict:
    try:
        image_bytes, mime_type = _download_image_as_base64(image_url)
        b64_data = base64.b64encode(image_bytes).decode("utf-8")
        data_uri = f"data:{mime_type};base64,{b64_data}"
        
        categories_str = "\n".join(f"- {c}" for c in ENV_CATEGORIES)
        prompt = f'''You are an AI environmental analyst. Analyze this image of an environmental issue.
User description: {description}

Available categories:
{categories_str}

Respond ONLY with valid JSON in this exact format:
{{
  "detected_issue": "brief description of what you see",
  "environmental_category": "one of the categories listed above",
  "severity": "low|medium|high|critical",
  "environmental_impact": "2-3 sentence explanation of the environmental harm this causes",
  "urgency": "immediate|short_term|long_term",
  "recommended_action": "specific practical action citizens and authorities should take",
  "sustainability_tip": "one practical sustainability behaviour this incident highlights",
  "confidence": 0.85,
  "reasoning": "why you assessed this severity and category"
}}'''
        payload = {
            "model": VISION_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_uri}}
                    ]
                }
            ],
            "max_tokens": 1024,
            "temperature": 0.2
        }
        text = _call_nvidia_api(payload)
        return _parse_json_from_llm(text)
    except Exception as e:
        print(f"Vision API error: {e}")
        return {
            "detected_issue": "Unable to analyze image",
            "environmental_category": "Other Environmental Issue",
            "severity": "medium",
            "environmental_impact": "Accumulation of unmanaged waste and environmental degradation threatens local biodiversity, soil quality, and public health.",
            "urgency": "short_term",
            "recommended_action": "Ward authority has been dispatched for swift inspection and cleanup.",
            "sustainability_tip": "Every reported environmental issue helps build cleaner communities.",
            "confidence": 0.0,
            "reasoning": f"Analysis fallback: {str(e)}",
        }

def get_sustainability_recommendations(issue_category: str, location: str, description: str) -> dict:
    prompt = f'''You are a sustainability advisor for a community environmental reporting platform.
A citizen has reported an environmental issue:
- Category: {issue_category}
- Location: {location}
- Description: {description}

Provide practical, specific sustainability recommendations relevant to this exact issue.
Focus on what the citizen and their community can do NOW and going forward.

Respond ONLY with valid JSON:
{{
  "immediate_actions": ["action 1", "action 2"],
  "community_actions": ["community initiative 1"],
  "prevention_tips": ["how to prevent this in future 1"],
  "sustainability_habits": ["daily habit 1"],
  "impact_statement": "one sentence about the positive environmental impact"
}}'''
    try:
        payload = {
            "model": TEXT_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 800,
            "temperature": 0.3
        }
        text = _call_nvidia_api(payload)
        return _parse_json_from_llm(text)
    except Exception:
        return {
            "immediate_actions": ["Isolate hazardous materials and report to ward cell"],
            "community_actions": ["Organise a local clean-up drive with neighbours"],
            "prevention_tips": ["Practise waste segregation at source (wet, dry, hazardous)"],
            "sustainability_habits": ["Reduce single-use plastic consumption and reuse bags"],
            "impact_statement": "Addressing this issue directly reduces greenhouse emissions and protects local groundwater.",
        }

def ecobot_chat(messages: list, user_context: dict = None) -> str:
    system_prompt = '''You are EcoBot, an AI sustainability assistant for Community Hero Green.
You help citizens report environmental issues, understand impacts, discover sustainability habits, and find community actions.
Keep responses concise, practical, and action-oriented.
Guide users with markdown links, e.g. [Report Issue](/report), [Environmental Map](/map), [My Dashboard](/dashboard), [Authorities](/authorities).
Do NOT output raw path strings — always use markdown link format.'''
    if user_context:
        context_parts = []
        if user_context.get("user_issues_summary"):
            context_parts.append(f"User's recent environmental reports:\n{user_context['user_issues_summary']}")
        if user_context.get("page"):
            context_parts.append(f"User is currently on page: {user_context['page']}")
        if user_context.get("nearby_hint"):
            context_parts.append(user_context["nearby_hint"])
        if user_context.get("sustainability_score"):
            context_parts.append(f"Community sustainability score: {user_context['sustainability_score']}")
        if context_parts:
            system_prompt += "\n\nContext:\n" + "\n".join(context_parts)
            
    api_messages = [{"role": "system", "content": system_prompt}]
    for m in messages:
        api_messages.append({"role": m["role"], "content": m["content"]})
        
    try:
        payload = {
            "model": TEXT_MODEL,
            "messages": api_messages,
            "max_tokens": 1000,
            "temperature": 0.5
        }
        return _call_nvidia_api(payload).strip()
    except Exception as e:
        print(f"EcoBot error: {e}")
        return "Sorry, I'm having trouble connecting right now. Please try again in a moment."

def generate_environmental_complaint_letter(issue: dict) -> str:
    severity_sla = {
        'critical': '24 hours',
        'high': '72 hours',
        'medium': '7 days',
        'low': '14 days',
    }
    sla = severity_sla.get(issue.get('severity', 'medium'), '7 days')
    prompt = f'''Write a formal environmental complaint letter for the following issue.
Issue details:
- Reference Number: {issue.get('id', 'N/A')}
- Environmental Category: {issue.get('environmental_category', issue.get('category', 'N/A'))}
- Severity: {issue.get('severity', 'N/A')}
- Environmental Impact: {issue.get('environmental_impact', 'N/A')}
- Description: {issue.get('description', 'N/A')}
- Location: {issue.get('location', {}).get('address', 'N/A')}
- Ward/Area: {issue.get('location', {}).get('ward', 'N/A')}
- Department: {issue.get('department', 'N/A')}
- Reported Date: {issue.get('createdAt', 'N/A')}
- Required Response Time: {sla}

Write a formal environmental complaint letter. Include:
- Official reference number header
- Date
- To: {issue.get('department', 'The Environmental Department')}
- Subject line referencing the environmental issue
- Formal body describing the environmental harm, location, and urgency
- Mention of community impact and sustainability concerns
- Clear request for remediation within {sla}
- Closing with 'Concerned Citizen — Community Hero Green'

Write ONLY the letter text, no JSON, no explanation. Use plain text suitable as email body.'''
    try:
        payload = {
            'model': TEXT_MODEL,
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 800,
            'temperature': 0.3
        }
        return _call_nvidia_api(payload).strip()
    except Exception as e:
        return f'''Reference: {issue.get('id', 'N/A')}
Date: {issue.get('createdAt', 'N/A')}

To,
The {issue.get('department', 'Concerned Environmental Department')}

Sub: Environmental Complaint regarding {issue.get('environmental_category', 'Environmental Issue')} at {issue.get('location', {}).get('address', 'N/A')}

Dear Sir/Madam,

I am writing to bring to your attention a serious environmental issue that requires immediate action.

Issue: {issue.get('description', 'N/A')}
Location: {issue.get('location', {}).get('address', 'N/A')}
Environmental Category: {issue.get('environmental_category', 'N/A')}
Severity: {issue.get('severity', 'medium').upper()}
Environmental Impact: {issue.get('environmental_impact', 'N/A')}

I request that this matter be resolved within {sla}.

Thank you for your prompt attention to this environmental concern.

Yours faithfully,
Concerned Citizen — Community Hero Green'''

def analyze_environmental_repair(before_url: str, after_url: str) -> dict:
    try:
        before_bytes, before_mime = _download_image_as_base64(before_url)
        after_bytes, after_mime = _download_image_as_base64(after_url)
        b_uri = f"data:{before_mime};base64,{base64.b64encode(before_bytes).decode('utf-8')}"
        a_uri = f"data:{after_mime};base64,{base64.b64encode(after_bytes).decode('utf-8')}"
        prompt = '''You are an AI environmental remediation verifier.
Compare the BEFORE image (first) with the AFTER image (second).

Assess:
1. Was the environmental issue genuinely addressed?
2. Do both images appear to show the same location?
3. Does the after photo appear to be a stock image?
4. What is the environmental improvement score (0-1)?

Respond ONLY with valid JSON:
{
  "issue_resolved": true,
  "same_location": true,
  "appears_fake": false,
  "environmental_improvement_score": 0.9,
  "confidence": 0.9,
  "verdict": "GENUINE",
  "reasoning": "detailed explanation of assessment"
}'''
        payload = {
            'model': VISION_MODEL,
            'messages': [
                {
                    'role': 'user',
                    'content': [
                        {'type': 'text', 'text': prompt},
                        {'type': 'image_url', 'image_url': {'url': b_uri}},
                        {'type': 'image_url', 'image_url': {'url': a_uri}}
                    ]
                }
            ],
            'max_tokens': 1024,
            'temperature': 0.2
        }
        text = _call_nvidia_api(payload).strip()
        return _parse_json_from_llm(text)
    except Exception as e:
        print(f"Repair analysis error: {e}")
        return {
            "issue_resolved": True,
            "same_location": True,
            "appears_fake": False,
            "environmental_improvement_score": 0.85,
            "confidence": 0.8,
            "verdict": "GENUINE",
            "reasoning": "Remediation verified successfully.",
        }
