# ==========================================================
# scripts/generators/hero_section.py
# Premium AI Hero Section
# ==========================================================

from generators.utils import *

def generate():

    divider("Generating Hero Section")

    write(
        "components/home/Hero.tsx",
"""
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import{

ArrowRight,
Sparkles,
Globe2,
ShieldCheck,
BrainCircuit,
MapPinned,
Mic,
ImageIcon

}from"lucide-react";

export default function Hero(){

return(

<section className="hero">

<div className="container">

<div className="grid lg:grid-cols-2 gap-20 items-center">

{/* LEFT */}

<motion.div

initial={{opacity:0,x:-40}}
animate={{opacity:1,x:0}}
transition={{duration:.8}}

>

<div className="badge">

<Sparkles size={16}/>

<span>

AI Powered Citizen Governance Platform

</span>

</div>

<h1 className="mt-6">

Transform

<span className="gradient-text">

 Citizen Voices

</span>

into

Smart Development Decisions

</h1>

<p className="mt-8">

LokPulse AI combines multilingual AI,
geospatial intelligence,
voice understanding,
computer vision,
government datasets
and explainable prioritization
to help MPs identify
the most impactful public issues.

</p>

<div className="flex gap-5 mt-10 flex-wrap">

<Link
href="/report"
className="btn btn-primary">

Report Issue

<ArrowRight size={18}/>

</Link>

<Link
href="/dashboard"
className="btn btn-outline">

Open Dashboard

</Link>

</div>

<div className="hero-stats mt-14">

<div>

<h3>25+</h3>

<p>Government Datasets</p>

</div>

<div>

<h3>22</h3>

<p>Languages Supported</p>

</div>

<div>

<h3>AI</h3>

<p>Multi-Agent System</p>

</div>

</div>

</motion.div>

{/* RIGHT */}

<motion.div

initial={{opacity:0,scale:.9}}
animate={{opacity:1,scale:1}}
transition={{duration:.8}}

className="relative"

>

<div className="hero-card ai-glow">

<div className="floating-card one">

<Mic/>

Voice Complaint

</div>

<div className="floating-card two">

<ImageIcon/>

Geo Image

</div>

<div className="floating-card three">

<BrainCircuit/>

AI Analysis

</div>

<div className="floating-card four">

<MapPinned/>

Hotspot Detection

</div>

<div className="center-orb rotate">

<div className="orb-inner">

<ShieldCheck size={80}/>

</div>

</div>

<div className="pulse-ring"/>

</div>

</motion.div>

</div>

</div>

</section>

)

}

"""
    )

    append(
        "styles/globals.css",
"""
.gradient-text{

background:linear-gradient(
90deg,
#2563eb,
#06b6d4
);

-webkit-background-clip:text;

-webkit-text-fill-color:transparent;

}

.hero-stats{

display:flex;

gap:50px;

flex-wrap:wrap;

}

.hero-stats h3{

font-size:2rem;

font-weight:800;

}

.hero-card{

position:relative;

height:650px;

border-radius:40px;

background:white;

overflow:hidden;

display:flex;

align-items:center;

justify-content:center;

}

.center-orb{

height:260px;

width:260px;

border-radius:50%;

background:

linear-gradient(
135deg,
#2563eb,
#06b6d4
);

display:flex;

align-items:center;

justify-content:center;

color:white;

box-shadow:

0 30px 80px rgba(37,99,235,.35);

}

.orb-inner{

height:180px;

width:180px;

border-radius:50%;

display:flex;

align-items:center;

justify-content:center;

background:white;

color:#2563eb;

}

.floating-card{

position:absolute;

padding:16px 22px;

background:white;

border-radius:18px;

display:flex;

gap:12px;

align-items:center;

font-weight:600;

box-shadow:

0 15px 35px rgba(0,0,0,.08);

animation:float 5s infinite ease-in-out;

}

.one{

top:60px;

left:50px;

}

.two{

top:90px;

right:40px;

}

.three{

bottom:120px;

left:20px;

}

.four{

bottom:70px;

right:40px;

}

.pulse-ring{

position:absolute;

height:340px;

width:340px;

border-radius:50%;

border:2px dashed rgba(37,99,235,.2);

animation:rotateBlob 18s linear infinite;

}

@media(max-width:992px){

.hero-card{

height:500px;

margin-top:60px;

}

.center-orb{

height:190px;

width:190px;

}

.orb-inner{

height:130px;

width:130px;

}

}
"""
    )

    success("Hero Section Generated")