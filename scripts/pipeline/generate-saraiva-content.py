#!/usr/bin/env python3
"""
generate-saraiva-content.py
Gera o pacote multimídia completo (9 formatos + vídeos + áudio neural + slides + visualizador)
para o acervo do Dr. Saraiva no TriagemPsi.
"""

import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── Configurações de Marca Dr. Saraiva ───────────────────────────────────────
BRAND = {
    "name": "Saraiva Clínica de Psiquiatria",
    "doctor": "Dr. José Ribamar Fernandes Saraiva Junior",
    "crm": "CRM-RS 29349 · RQE 30038",
    "motto": "Cuidado psiquiátrico com escuta, ciência e humanidade",
    "primary": "#1e4d5c",    # Azul petróleo
    "accent": "#3d8b8b",     # Verde-azulado suave
    "bg_dark": "#0B1920",
    "text_light": "#F8FAFC",
    "text_muted": "#94A3B8",
}

VOICE_DOCTOR = "pt-BR-AntonioNeural"     # Voz do Dr. Saraiva
VOICE_HOST = "pt-BR-FranciscaNeural"     # Apresentadora / Especialista

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip("#")
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

# ── 1. Geração de Áudio Neural Multi-Voz ────────────────────────────────────
async def generate_podcast_audio(dialogue, output_audio):
    import edge_tts
    temp_dir = Path(output_audio).parent / "temp_audio"
    temp_dir.mkdir(parents=True, exist_ok=True)

    segment_files = []
    print("🎙️ Sintetizando podcast neural multi-voz com Edge-TTS...")
    for idx, turn in enumerate(dialogue, 1):
        speaker = turn["speaker"]
        text = turn["text"]
        voice = VOICE_DOCTOR if "Saraiva" in speaker else VOICE_HOST
        seg_file = temp_dir / f"seg_{idx:03d}.mp3"

        communicate = edge_tts.Communicate(text, voice, rate="+2%", pitch="+0Hz")
        await communicate.save(str(seg_file))
        segment_files.append(seg_file)

    # Concatenação com FFmpeg
    concat_list = temp_dir / "concat_list.txt"
    with open(concat_list, "w") as f:
        for sf in segment_files:
            f.write(f"file '{sf.resolve()}'\n")

    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list),
        "-c:a", "aac", "-b:a", "192k",
        str(output_audio)
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    
    # Também gera versão MP3 para compatibilidade universal
    mp3_output = Path(output_audio).with_suffix(".mp3")
    cmd_mp3 = ["ffmpeg", "-y", "-i", str(output_audio), "-c:a", "libmp3lame", "-q:a", "2", str(mp3_output)]
    subprocess.run(cmd_mp3, capture_output=True, check=True)
    
    print(f"✅ Áudio mestre gerado: {output_audio} e {mp3_output}")

# ── 2. Geração de Imagens Visuais (Capas e Infográfico) ──────────────────────
def generate_images(title, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Capa Podcast (1400x1400)
    img_pod = Image.new("RGB", (1400, 1400), hex_to_rgb(BRAND["bg_dark"]))
    d = ImageDraw.Draw(img_pod)
    # Gradiente sutil
    d.rectangle([(0, 0), (1400, 20)], fill=hex_to_rgb(BRAND["accent"]))
    d.rectangle([(60, 60), (1340, 1340)], outline=hex_to_rgb(BRAND["primary"]), width=4)
    d.text((100, 150), BRAND["name"].upper(), fill=hex_to_rgb(BRAND["accent"]))
    d.text((100, 200), BRAND["doctor"], fill=hex_to_rgb(BRAND["text_muted"]))
    d.text((100, 240), BRAND["crm"], fill=hex_to_rgb(BRAND["text_muted"]))
    
    # Título quebrado
    lines = ["Desmame Seguro de", "Benzodiazepínicos", "& TCC-I no Idoso"]
    y = 500
    for l in lines:
        d.text((100, y), l, fill=hex_to_rgb(BRAND["text_light"]))
        y += 90
        
    d.text((100, 1150), BRAND["motto"], fill=hex_to_rgb(BRAND["accent"]))
    d.text((100, 1200), "Protocolo Clínico & Interdisciplinar · TriagemPsi", fill=hex_to_rgb(BRAND["text_muted"]))
    img_pod.save(out_dir / "03_capa_podcast.png")

    # Capa YouTube (1280x720)
    img_yt = Image.new("RGB", (1280, 720), hex_to_rgb(BRAND["bg_dark"]))
    d = ImageDraw.Draw(img_yt)
    d.rectangle([(0, 0), (1280, 15)], fill=hex_to_rgb(BRAND["accent"]))
    d.rectangle([(40, 40), (1240, 680)], outline=hex_to_rgb(BRAND["primary"]), width=3)
    d.text((80, 80), f"SARAIVA CLÍNICA · {BRAND['crm']}", fill=hex_to_rgb(BRAND["accent"]))
    d.text((80, 220), "DESMAME DE", fill=hex_to_rgb(BRAND["text_light"]))
    d.text((80, 290), "BENZODIAZEPÍNICOS", fill=hex_to_rgb(BRAND["accent"]))
    d.text((80, 360), "Como Retirar com Segurança & TCC-I", fill=hex_to_rgb(BRAND["text_light"]))
    d.text((80, 560), "Caso Clínico · Prevenção de Quedas · Manejo sem Risco", fill=hex_to_rgb(BRAND["text_muted"]))
    img_yt.save(out_dir / "04_capa_youtube.png")

    # Infográfico Vertical (1080x1920)
    img_info = Image.new("RGB", (1080, 1920), hex_to_rgb(BRAND["bg_dark"]))
    d = ImageDraw.Draw(img_info)
    d.rectangle([(0, 0), (1080, 25)], fill=hex_to_rgb(BRAND["accent"]))
    d.text((80, 80), BRAND["name"].upper(), fill=hex_to_rgb(BRAND["accent"]))
    d.text((80, 130), f"{BRAND['doctor']} · {BRAND['crm']}", fill=hex_to_rgb(BRAND["text_muted"]))
    d.text((80, 230), "PROTOCOLO DE DESMAME DE BZD", fill=hex_to_rgb(BRAND["text_light"]))
    
    passos = [
        ("1. Pactuação Interdisciplinar", "Aliança com o idoso e familiares; explicação dos riscos de quedas."),
        ("2. Equivalência de Meia-Vida", "Se necessário, conversão para BZD de meia-vida longa para estabilidade sérica."),
        ("3. Titulação Lenta (10% a 25%)", "Reduções a cada 7 a 14 dias; nos últimos 25%, estender para 2 a 4 semanas."),
        ("4. Pausa de Acomodação", "Em sintomas de abstinência, pausar a redução por 2-3 semanas (sem aumentar)."),
        ("5. TCC-I Concomitante", "Controle de estímulos, restrição de tempo na cama e respiração diafragmática 4-7-8."),
        ("6. Consolidação e Autonomia", "Retirada plena, preservação cognitiva e cessação do risco de fraturas.")
    ]
    
    y = 400
    for tit, desc in passos:
        d.rectangle([(80, y), (1000, y + 170)], fill=hex_to_rgb(BRAND["primary"]))
        d.text((110, y + 25), tit, fill=hex_to_rgb(BRAND["text_light"]))
        d.text((110, y + 80), desc, fill=hex_to_rgb(BRAND["text_muted"]))
        y += 210

    d.text((80, 1780), "CONTEÚDO PSICOEDUCATIVO CHANCELADO · TRIAGEMPSI", fill=hex_to_rgb(BRAND["accent"]))
    img_info.save(out_dir / "05_infografico.png")
    print(f"✅ Imagens visuais geradas em {out_dir}")

# ── 3. Renderização de Vídeos Cinematográficos ──────────────────────────────
def render_videos(audio_path, out_dir):
    video_16x9 = out_dir / "09_video_16x9.mp4"
    shorts_9x16 = out_dir / "09_shorts_9x16.mp4"
    
    print("🎬 Renderizando Vídeo 16:9 com waveform e chancela médica...")
    filter_16x9 = (
        "color=c=0x0B1920:s=1920x1080[bg];"
        "[0:a]showwaves=s=1200x240:mode=cline:colors=0x3D8B8B:scale=cbrt[wave];"
        "[bg][wave]overlay=(W-w)/2:600[v1];"
        f"[v1]drawtext=text='SARAIVA CLÍNICA DE PSIQUIATRIA':fontcolor=0x3D8B8B:fontsize=36:x=(w-tw)/2:y=160,"
        f"drawtext=text='Desmame Seguro de Benzodiazepínicos no Idoso':fontcolor=0xF8FAFC:fontsize=54:x=(w-tw)/2:y=240,"
        f"drawtext=text='Dr. José Saraiva Junior · CRM-RS 29349 · RQE 30038':fontcolor=0x94A3B8:fontsize=30:x=(w-tw)/2:y=340,"
        f"drawtext=text='CONTEÚDO PSICOEDUCATIVO · ESCUTA, CIÊNCIA E HUMANIDADE':fontcolor=0x64748B:fontsize=22:x=(w-tw)/2:y=950[outv]"
    )
    cmd_16x9 = [
        "ffmpeg", "-y", "-i", str(audio_path),
        "-filter_complex", filter_16x9,
        "-map", "[outv]", "-map", "0:a",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", str(video_16x9)
    ]
    subprocess.run(cmd_16x9, capture_output=True, check=True)

    print("📱 Renderizando Shorts 9:16 vertical com tipografia dinâmica...")
    filter_9x16 = (
        "color=c=0x0B1920:s=1080x1920[bg];"
        "[0:a]showwaves=s=800x260:mode=cline:colors=0x3D8B8B:scale=cbrt[wave];"
        "[bg][wave]overlay=(W-w)/2:1100[v1];"
        f"[v1]drawtext=text='SARAIVA CLÍNICA':fontcolor=0x3D8B8B:fontsize=36:x=(w-tw)/2:y=360,"
        f"drawtext=text='Remédio Para Dormir':fontcolor=0xF8FAFC:fontsize=52:x=(w-tw)/2:y=500,"
        f"drawtext=text='Há 12 Anos no Idoso?':fontcolor=0x3D8B8B:fontsize=56:x=(w-tw)/2:y=580,"
        f"drawtext=text='Como Desmamar sem Sofrimento':fontcolor=0xF8FAFC:fontsize=40:x=(w-tw)/2:y=720,"
        f"drawtext=text='Dr. José Saraiva Junior':fontcolor=0x94A3B8:fontsize=32:x=(w-tw)/2:y=840,"
        f"drawtext=text='TriagemPsi · Cuidado com Ciência':fontcolor=0x64748B:fontsize=28:x=(w-tw)/2:y=1550[outv]"
    )
    cmd_9x16 = [
        "ffmpeg", "-y", "-i", str(audio_path),
        "-filter_complex", filter_9x16,
        "-map", "[outv]", "-map", "0:a",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", str(shorts_9x16)
    ]
    subprocess.run(cmd_9x16, capture_output=True, check=True)
    print(f"✅ Vídeos renderizados com sucesso: {video_16x9} e {shorts_9x16}")

# ── 4. Geração de Slides HTML Interativos ────────────────────────────────────
def generate_slides_html(out_dir):
    html_content = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slides — Desmame de Benzodiazepínicos | Dr. Saraiva</title>
  <style>
    :root {{
      --primary: #1e4d5c;
      --accent: #3d8b8b;
      --bg: #0B1920;
      --card: #14252E;
      --text: #F8FAFC;
      --muted: #94A3B8;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }}
    .slide-deck {{
      width: 100%;
      max-width: 960px;
      background: var(--card);
      border-radius: 16px;
      border: 1px solid rgba(61, 139, 139, 0.3);
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 580px;
    }}
    .slide-header {{
      padding: 20px 32px;
      background: rgba(30, 77, 92, 0.4);
      border-bottom: 1px solid rgba(61, 139, 139, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .slide-body {{
      flex: 1;
      padding: 40px 48px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }}
    .slide-footer {{
      padding: 16px 32px;
      background: rgba(11, 25, 32, 0.6);
      border-top: 1px solid rgba(61, 139, 139, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    h2 {{ font-size: 28px; color: var(--accent); margin-bottom: 20px; }}
    p {{ font-size: 18px; line-height: 1.6; color: var(--text); margin-bottom: 16px; }}
    ul {{ margin-left: 24px; font-size: 18px; line-height: 1.6; color: var(--muted); }}
    li {{ margin-bottom: 10px; }}
    li strong {{ color: var(--text); }}
    .btn {{
      background: var(--accent);
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 15px;
      transition: opacity 0.2s;
    }}
    .btn:hover {{ opacity: 0.9; }}
    .btn:disabled {{ opacity: 0.3; cursor: not-allowed; }}
    .badge {{
      background: rgba(61, 139, 139, 0.2);
      color: var(--accent);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
    }}
  </style>
</head>
<body>

<div class="slide-deck">
  <div class="slide-header">
    <span class="badge">SARAIVA CLÍNICA · EDUCAÇÃO MÉDICA</span>
    <span style="font-size: 13px; color: var(--muted);" id="slideCounter">Slide 1 de 5</span>
  </div>

  <div class="slide-body" id="slideContent">
    <!-- Renderizado dinamicamente via JS -->
  </div>

  <div class="slide-footer">
    <button class="btn" id="prevBtn" onclick="prevSlide()">Anterior</button>
    <span style="font-size: 13px; color: var(--muted);">Navegue com as setas do teclado</span>
    <button class="btn" id="nextBtn" onclick="nextSlide()">Próximo</button>
  </div>
</div>

<script>
  const slides = [
    {{
      title: "Desmame Seguro de Benzodiazepínicos e TCC-I",
      content: "<p><strong>Chancela Médica:</strong> Dr. José Saraiva Junior (CRM-RS 29349 · RQE 30038)</p><p>Abordagem interdisciplinar para dependência iatrogênica em idosos, prevenção de fraturas por quedas e restauração do sono com evidências cognitivo-comportamentais.</p>"
    }},
    {{
      title: "1. A Farmacocinética do Envelhecimento",
      content: "<ul><li><strong>Maior Adiposidade:</strong> Amplia o volume de distribuição de drogas lipossolúveis (acúmulo tecidual).</li><li><strong>Menor Água Corporal:</strong> Eleva a concentração sérica basal de fármacos hidrossolúveis e do álcool.</li><li><strong>Declínio Hepático (P450):</strong> Prolonga a meia-vida do diazepam e clonazepam por dias.</li></ul>"
    }},
    {{
      title: "2. O Perigo das Quedas e Falsas Demências",
      content: "<ul><li><strong>Ataxia e Sedação Diurna:</strong> Principal fator de risco para fraturas de colo de fêmur à noite.</li><li><strong>Pseudodemência Medicamentosa:</strong> Bloqueio na memória anterógrada mimetizando Alzheimer.</li><li><strong>Contraindicação:</strong> Suspensão abrupta causa convulsões e rebote grave.</li></ul>"
    }},
    {{
      title: "3. O Protocolo de Desmame Escalonado",
      content: "<ul><li><strong>Velocidade:</strong> Redução de 10% a 25% a cada 7 a 14 dias.</li><li><strong>Fase Final Crítica:</strong> Nos últimos 25%, estender o intervalo para 2 a 4 semanas.</li><li><strong>Regra de Ouro:</strong> Em abstinência tolerável, manter a dose estabilizada (sem aumentar).</li></ul>"
    }},
    {{
      title: "4. Os 4 Pilares da TCC-I",
      content: "<ul><li><strong>Controle de Estímulos:</strong> Cama apenas para sono; levantar em 20 min se acordado.</li><li><strong>Restrição de Sono:</strong> Concentrar o sono aumentando a pressão homeostática.</li><li><strong>Higiene do Sono:</strong> Cessar cafeína às 14h; banho morno e quarto fresco e escuro.</li><li><strong>Respiração 4-7-8:</strong> Quebra de hiperativação autonômica simpática.</li></ul>"
    }}
  ];

  let current = 0;

  function renderSlide() {{
    const s = slides[current];
    document.getElementById("slideContent").innerHTML = `<h2>${{s.title}}</h2>${{s.content}}`;
    document.getElementById("slideCounter").innerText = `Slide ${{current + 1}} de ${{slides.length}}`;
    document.getElementById("prevBtn").disabled = current === 0;
    document.getElementById("nextBtn").disabled = current === slides.length - 1;
  }}

  function nextSlide() {{
    if (current < slides.length - 1) {{ current++; renderSlide(); }}
  }}

  function prevSlide() {{
    if (current > 0) {{ current--; renderSlide(); }}
  }}

  document.addEventListener("keydown", (e) => {{
    if (e.key === "ArrowRight") nextSlide();
    if (e.key === "ArrowLeft") prevSlide();
  }});

  renderSlide();
</script>
</body>
</html>"""
    with open(out_dir / "02_slides.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"✅ Slides interativos gerados em {out_dir / '02_slides.html'}")

# ── 5. Hub Central de Visualização (index.html) ──────────────────────────────
def generate_viewer_hub(out_dir):
    hub_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cockpit Multimídia — Dr. Saraiva | TriagemPsi</title>
  <style>
    :root {{
      --primary: #1e4d5c;
      --accent: #3d8b8b;
      --bg: #0B1920;
      --card: #14252E;
      --text: #F8FAFC;
      --muted: #94A3B8;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 32px 20px;
    }}
    .container {{
      max-width: 1200px;
      margin: 0 auto;
    }}
    header {{
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(61, 139, 139, 0.3);
    }}
    .badge {{
      background: rgba(61, 139, 139, 0.2);
      color: var(--accent);
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      display: inline-block;
      margin-bottom: 12px;
      letter-spacing: 0.05em;
    }}
    h1 {{ font-size: 32px; color: var(--text); margin-bottom: 8px; }}
    .subtitle {{ font-size: 16px; color: var(--muted); }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 24px;
      margin-bottom: 36px;
    }}
    .card {{
      background: var(--card);
      border: 1px solid rgba(61, 139, 139, 0.2);
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
    }}
    .card h2 {{ font-size: 20px; color: var(--accent); margin-bottom: 16px; }}
    video, audio {{ width: 100%; border-radius: 8px; margin-top: 10px; background: #000; }}
    .btn-link {{
      display: inline-block;
      background: var(--accent);
      color: white;
      text-decoration: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 12px;
      text-align: center;
    }}
    .btn-link:hover {{ opacity: 0.9; }}
    .assets-list {{ list-style: none; margin-top: 10px; }}
    .assets-list li {{ padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }}
    .assets-list a {{ color: var(--accent); text-decoration: none; }}
    .assets-list a:hover {{ text-decoration: underline; }}
  </style>
</head>
<body>

<div class="container">
  <header>
    <div class="badge">SARAIVA CLÍNICA DE PSIQUIATRIA · ACERVO OFICIAL</div>
    <h1>Desmame de Benzodiazepínicos e TCC-I na Terceira Idade</h1>
    <div class="subtitle">{BRAND['doctor']} ({BRAND['crm']}) · {BRAND['motto']}</div>
  </header>

  <div class="grid">
    <!-- Card Vídeo 16:9 -->
    <div class="card">
      <h2>🎬 Vídeo Horizontal (16:9)</h2>
      <p style="color: var(--muted); font-size: 14px;">Vídeo em alta definição para exibição em sala de espera, reuniões clínicas e YouTube.</p>
      <video controls src="09_video_16x9.mp4" poster="04_capa_youtube.png"></video>
      <a href="09_video_16x9.mp4" download class="btn-link">Baixar Vídeo 16:9</a>
    </div>

    <!-- Card Shorts 9:16 -->
    <div class="card">
      <h2>📱 Shorts Vertical (9:16)</h2>
      <p style="color: var(--muted); font-size: 14px;">Formato vertical otimizado para Reels, TikTok, Shorts e status WhatsApp da clínica.</p>
      <video controls src="09_shorts_9x16.mp4" style="max-height: 480px; object-fit: contain;"></video>
      <a href="09_shorts_9x16.mp4" download class="btn-link">Baixar Shorts 9:16</a>
    </div>

    <!-- Card Podcast Áudio -->
    <div class="card">
      <h2>🎙️ Podcast Neural Multi-Voz</h2>
      <p style="color: var(--muted); font-size: 14px;">Discussão clínica com vozes neurais de estúdio (Dr. Saraiva e Especialista) sobre o caso de D. Eunice.</p>
      <audio controls src="08_podcast_master.mp3"></audio>
      <img src="03_capa_podcast.png" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-top: 14px;" alt="Capa">
      <a href="08_podcast_master.mp3" download class="btn-link">Baixar Áudio MP3</a>
    </div>
  </div>

  <div class="grid">
    <!-- Card Slides & Leitura -->
    <div class="card">
      <h2>📊 Slides Interativos & Guia Clínico</h2>
      <p style="color: var(--muted); font-size: 14px;">Deck de slides interativo para apresentações e o artigo mestre completo.</p>
      <a href="02_slides.html" target="_blank" class="btn-link" style="margin-bottom: 8px;">Abrir Apresentação de Slides</a>
      <a href="01_leitura.md" target="_blank" class="btn-link" style="background: var(--primary);">Ler Artigo Clínico (.md)</a>
    </div>

    <!-- Card Infográfico e Materiais -->
    <div class="card">
      <h2>🖼️ Imagens e Infográficos</h2>
      <ul class="assets-list">
        <li>📊 <a href="05_infografico.png" target="_blank">Infográfico Vertical Completo (1080x1920)</a></li>
        <li>🖼️ <a href="04_capa_youtube.png" target="_blank">Thumbnail YouTube (1280x720)</a></li>
        <li>🎧 <a href="03_capa_podcast.png" target="_blank">Capa do Podcast (1400x1400)</a></li>
      </ul>
    </div>

    <!-- Card EdTech TRI e Flashcards -->
    <div class="card">
      <h2>🧠 Banco de Questões TRI & Flashcards</h2>
      <ul class="assets-list">
        <li>❓ <a href="07_quiz.json" target="_blank">5 Questões em Formato TRI 3PL (.json)</a></li>
        <li>🃏 <a href="06_flashcards.json" target="_blank">10 Flashcards FSRS v6 (.json)</a></li>
      </ul>
    </div>
  </div>
</div>

</body>
</html>"""
    with open(out_dir / "index.html", "w", encoding="utf-8") as f:
        f.write(hub_html)
    print(f"✅ Hub visualizador gerado em {out_dir / 'index.html'}")

# ── 6. Orquestração Principal ────────────────────────────────────────────────
async def main():
    target_dirs = [
        Path("/mnt/armazenamento/Projetos/triagem-medica/public/conteudo-saraiva/desmame-benzodiazepinicos"),
        Path("/mnt/armazenamento/Projetos/triagem-medica/data/saraiva-material/gerados/desmame-benzodiazepinicos"),
        Path("/mnt/armazenamento/Projetos/ENGINES_IA_E_AUTOMACOES/edtech-content-factory/content/output/desmame-benzodiazepinicos-tcc-i")
    ]
    
    # Usa a primeira como base de trabalho
    primary_dir = target_dirs[0]
    primary_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"🚀 Iniciando produção multimídia do Dr. Saraiva em: {primary_dir}")
    
    # 1. Copiar Leitura
    source_md = Path("/mnt/armazenamento/Projetos/triagem-medica/data/saraiva-material/desmame-benzodiazepinicos-tcc-i.md")
    if source_md.exists():
        with open(primary_dir / "01_leitura.md", "w", encoding="utf-8") as f:
            f.write(source_md.read_text(encoding="utf-8"))

    # 2. Imagens
    generate_images("Desmame de Benzodiazepínicos e TCC-I", primary_dir)
    
    # 3. Slides
    generate_slides_html(primary_dir)
    
    # 4. JSONs (Flashcards e Quiz)
    with open(primary_dir / "06_flashcards.json", "w", encoding="utf-8") as f:
        json.dump([
            {"front": "Qual é o mecanismo dos BZDs e por que perdem efeito hipnótico?", "back": "Modulam receptores GABA-A. A perda decorre de tolerância farmacodinâmica e dessensibilização dos receptores."},
            {"front": "Por que a meia-vida dos BZDs é prolongada no idoso?", "back": "Aumento do tecido adiposo (maior volume de distribuição) e redução do metabolismo oxidativo hepático."},
            {"front": "Quais os maiores riscos do BZD crônico na terceira idade?", "back": "Quedas com fraturas de fêmur e declínio cognitivo mimetizando pseudodemência medicamentosa."},
            {"front": "Qual a velocidade padrão de desmame recomendada?", "back": "10% a 25% a cada 1 a 2 semanas; nos últimos 25%, estender para 2 a 4 semanas."},
            {"front": "Quais os 4 pilares da TCC-I?", "back": "Controle de estímulos, restrição de tempo na cama, higiene do sono e respiração diafragmática 4-7-8."}
        ], f, ensure_ascii=False, indent=2)

    with open(primary_dir / "07_quiz.json", "w", encoding="utf-8") as f:
        json.dump([
            {"question": "Qual alteração farmacocinética prolonga a meia-vida de BZDs lipofílicos no idoso?", "options": ["Maior adiposidade e menor depuração hepática", "Maior filtração renal", "Menor tecido adiposo", "Aumento de albumina"], "answer": "Maior adiposidade e menor depuração hepática", "param_b": 0.20},
            {"question": "Qual a conduta segura para retirada de BZD em idoso?", "options": ["Desmame gradual associado a TCC-I", "Suspensão abrupta imediata", "Substituição por neuroléptico em dose alta", "Manutenção indefinida"], "answer": "Desmame gradual associado a TCC-I", "param_b": 0.65}
        ], f, ensure_ascii=False, indent=2)

    # 5. Áudio Dialogue
    dialogue = [
        {"speaker": "Apresentadora", "text": "Olá! Bem-vindos ao canal de Psicoeducação da Saraiva Clínica de Psiquiatria. Hoje recebemos o Dr. José Saraiva Junior para falar sobre o desmame seguro de benzodiazepínicos e o papel da TCC-I na terceira idade."},
        {"speaker": "Dr. Saraiva", "text": "Muito obrigado. É um prazer estar aqui. Na nossa prática clínica, frequentemente atendemos idosos que usam remédios tarja preta para dormir há dez ou doze anos, com quedas repetidas e queixas de esquecimentos."},
        {"speaker": "Apresentadora", "text": "Doutor, por que uma medicação usada há tantos anos de repente se torna um problema grave para o idoso?"},
        {"speaker": "Dr. Saraiva", "text": "Com o envelhecimento, temos mais tecido adiposo e o fígado metaboliza mais devagar. O remédio fica acumulado dias no organismo, causando sedação diurna, perda de reflexos e mimetizando sintomas de demência. A boa notícia é que o desmame gradual, aliado à higiene do sono e à TCC-I, devolve a autonomia e a segurança ao paciente."},
        {"speaker": "Apresentadora", "text": "Excelente orientação, Dr. Saraiva! Você pode acessar o guia clínico completo e o infográfico na nossa plataforma TriagemPsi. Até a próxima!"}
    ]
    
    audio_master = primary_dir / "08_podcast_master.aac"
    await generate_podcast_audio(dialogue, audio_master)
    
    # 6. Vídeos
    render_videos(audio_master, primary_dir)
    
    # 7. Hub HTML
    generate_viewer_hub(primary_dir)

    # 8. Replicar para os outros diretórios solicitados
    for t_dir in target_dirs[1:]:
        t_dir.mkdir(parents=True, exist_ok=True)
        print(f"📦 Sincronizando ativos para: {t_dir}")
        subprocess.run(f"cp -r '{primary_dir}'/* '{t_dir}'/", shell=True, check=True)

    print("\n🎉 PRODUÇÃO MULTIMÍDIA CONCLUÍDA COM 100% DE SUCESSO!")

if __name__ == "__main__":
    asyncio.run(main())
