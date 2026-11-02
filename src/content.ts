// Single source of truth for every word and number on the site.
// Resume figures are copied as written. GitHub data was read from
// github.com/thelostbong on 2026-11-02. All open questions are resolved.

export type Stat = { value: string; label: string };

export const profile = {
  name: "Nayeemuddin Mohammed",
  handle: "thelostbong",
  title: "AI Infrastructure / MLOps Engineer",
  location: "Germany",
  tagline: "Training models that are just as confused as I am.", // GitHub bio, easter egg only
  summary:
    "Two years of production DevOps and cloud work at Tata Consultancy Services (AWS, Terraform, Kubernetes, GitLab CI/CD). At TH Deggendorf I applied that foundation to AI systems: real-time computer vision for factory-floor defect detection, and generative pipelines that turn product text into catalogue-ready imagery.",
  // The user approved publishing DOB, phone and email (2026-11-02). No postal address.
  contact: {
    email: "nayeemuddin.mohammed@stud.th-deg.de",
    phone: "+49 15563598740",
    dob: "03.03.2001",
  },
  links: {
    github: "https://github.com/thelostbong",
    linkedin: "https://linkedin.com/in/nayeemuddin-mohammed-03",
    cv: "/Nayeemuddin_Mohammed_CV.pdf",
  },
} as const;

export type Role = {
  id: string;
  title: string;
  org: string;
  place: string;
  start: string;
  end: string;
  duration: string;
  headline: string; // one sentence for the summary card; the bullets live in the detail panel
  bullets: { label: string; text: string }[];
  stats: Stat[];
};

// Experience, newest first.
export const experience: Role[] = [
  {
    id: "thd-cv",
    title: "Research Assistant, AI & Computer Vision",
    org: "Technische Hochschule Deggendorf",
    place: "Cham, Germany",
    start: "Feb 2026",
    end: "Jul 2026",
    duration: "6 months",
    headline: "Built a real-time, multi-camera defect-detection pipeline on Raspberry Pi 5 and linked it to Tulip MES.",
    bullets: [
      {
        label: "Edge AI Inspection",
        text: "Delivered a YOLOv12 assembly-inspection pipeline on Raspberry Pi 5 spanning 16 product variants, reaching 95% mAP@50, precision, and recall, and replacing manual visual inspection with real-time multi-camera defect detection.",
      },
      {
        label: "Inference Latency",
        text: "Cut model inference under 500ms, with the full edge-to-MES round trip (detection through the REST API to a recorded result) landing under one second per unit.",
      },
      {
        label: "MES Integration",
        text: "Designed the REST API (Python/FastAPI) and offline-queuing layer linking edge inference to Tulip MES, producing zero-duplicate, audit-ready quality records with full edge-to-production traceability.",
      },
    ],
    stats: [
      { value: "95%", label: "mAP@50, precision, recall" },
      { value: "<500ms", label: "model inference" },
      { value: "<1s", label: "edge-to-MES round trip" },
      { value: "16", label: "product variants" },
    ],
  },
  {
    id: "thd-doe",
    title: "Research Assistant, AI & Statistical Modelling",
    org: "Technische Hochschule Deggendorf",
    place: "Cham, Germany",
    start: "Sep 2025",
    end: "Dec 2025",
    duration: "4 months",
    headline: "Automated DOE and statistical analysis in R and Python. The pipeline now teaches DOE methodology at THD.",
    bullets: [
      {
        label: "DOE & Predictive Modelling",
        text: "Designed and ran CCD-RSM, D-optimal, and mixed factorial DOE experiments across additive manufacturing and robotics domains.",
      },
      {
        label: "Automation",
        text: "Developed R/Python pipelines combining ANOVA and ML-based optimization to replace manual statistical analysis.",
      },
      {
        label: "Curriculum Adoption",
        text: "That pipeline is now used to teach DOE methodology to THD students.",
      },
    ],
    stats: [
      { value: "3", label: "DOE designs: CCD-RSM, D-optimal, mixed factorial" },
      { value: "2", label: "domains: additive manufacturing, robotics" },
    ],
  },
  {
    id: "tcs",
    title: "DevOps Engineer, IoT & Cloud Infrastructure",
    org: "Tata Consultancy Services",
    place: "Hyderabad, India",
    start: "Mar 2023",
    end: "Feb 2025",
    duration: "2 years",
    headline: "Automated CI/CD and ran Kubernetes and AWS IoT infrastructure serving 10,000+ edge devices.",
    bullets: [
      {
        label: "CI/CD Automation",
        text: "Replaced manual deployment steps with GitLab, Jenkins, and SonarQube pipelines for IoT firmware and backend releases, cutting deployment time from 48 hours to under 30 minutes and moving release cadence from bi-weekly to on-demand.",
      },
      {
        label: "Cloud Infrastructure",
        text: "Provisioned and managed Terraform-based infrastructure on Kubernetes (Amazon EKS), containerizing and running 50+ microservices across 300+ pods with Docker in 4 lifecycle environments, monitored through custom PostgreSQL-backed KPI dashboards in Grafana.",
      },
      {
        label: "Real-Time IoT Pipelines",
        text: "Deployed AWS IoT Core, Lambda, and IoT Analytics for an event-driven data architecture over MQTT and HTTP, sustaining 99.99% uptime across 10,000+ active edge devices and 2M+ daily events.",
      },
    ],
    stats: [
      { value: "48h → <30min", label: "deployment time" },
      { value: "300+", label: "pods across 50+ microservices" },
      { value: "99.99%", label: "uptime" },
      { value: "10,000+", label: "active edge devices" },
      { value: "2M+", label: "daily events" },
    ],
  },
];

export type Project = {
  slug: string;
  number: string; // index shown on the card
  title: string;
  repo: string | null; // GitHub repo name, null if not public
  objective: string;
  summary: string;
  metricsLine: string; // one sentence that ties the metrics together; *asterisks* mark the figures
  stack: string[];
  stats: Stat[];
  topics: string[];
  media: { cover: string; demo?: string }; // supplied by you, see asset list
};

// Featured projects. Six cards.
export const projects: Project[] = [
  {
    slug: "lineguard",
    number: "01",
    title: "AI-Based Automated Assembly Inspection with MES Integration",
    repo: "AI-Based-Automated-Assembly-Inspection-with-MES-Integration",
    objective:
      "Replace manual visual inspection on an assembly line with real-time, multi-camera defect detection.",
    summary:
      "Three cameras feed a YOLOv12s ONNX model on a Raspberry Pi 5. Results post straight into a Tulip MES, with an offline queue so records stay complete and duplicate-free.",
    metricsLine:
      "*95% mAP@50* across *16 product variants*, with inference under *500ms* and the full edge-to-MES round trip under *one second*.",
    stack: ["YOLOv12s", "ONNX", "Raspberry Pi 5", "Python", "REST API", "Tulip MES"],
    stats: [
      { value: "95%", label: "mAP@50" },
      { value: "<500ms", label: "inference" },
      { value: "<1s", label: "edge-to-MES" },
      { value: "16", label: "variants" },
    ],
    topics: ["raspberry-pi", "computer-vision", "yolo", "manufacturing", "mes", "onnx"],
    media: { cover: "/img/missions/lineguard.jpg" },
  },
  {
    slug: "nano-sentry",
    number: "02",
    title: "Automated Defect Detection with Edge AI",
    repo: "Automated-Defect-Detection-using-Edge-AI",
    objective:
      "Run defect classification on a microcontroller, with no cloud and no GPU at inference.",
    summary:
      "A two-stage YOLOv11n pipeline for colour and missing-piece defects, quantized to INT8 and running on-device on an ESP32-P4.",
    metricsLine:
      "*Over 95%* detection accuracy in *under 2s* per inference, with a false-positive rate below *5%*, entirely on a microcontroller.",
    stack: ["YOLOv11n", "INT8 quantization", "ESP32-P4", "ESP-IDF", "Python"],
    stats: [
      { value: ">95%", label: "detection accuracy" },
      { value: "<2s", label: "inference" },
      { value: "<5%", label: "false-positive rate" },
    ],
    topics: ["embedded", "computer-vision", "esp32", "yolo", "object-detection", "quantization"],
    media: { cover: "/img/missions/nano-sentry.jpg" },
  },
  {
    slug: "threadline",
    number: "03",
    title: "Multimodal Generative AI Pipeline for Fashion",
    repo: "Fashion-article-image-generation",
    objective:
      "Turn German product copy into catalogue-ready fashion images, built with NKD.",
    summary:
      "Four models in sequence: Helsinki-NLP translation, Phi-3 Mini for prompt writing, FLUX.1-schnell with a LoRA for generation, and CLIP scoring to pick the keepers.",
    metricsLine:
      "*87.6%* of images pass on the first try at about *42s* each, for roughly *90% lower cost* than a photo shoot.",
    stack: ["Helsinki-NLP (MarianMT)", "Phi-3 Mini", "FLUX.1-schnell + LoRA", "CLIP", "PyTorch"],
    stats: [
      { value: "87.6%", label: "first-pass success" },
      { value: "~90%", label: "lower cost than photography" },
      { value: "42s", label: "per image" },
    ],
    topics: ["flux", "pytorch", "image-generation", "lora", "clip", "diffusion-models", "llm"],
    media: { cover: "/img/missions/threadline.jpg" },
  },
  {
    slug: "impact-twin",
    number: "04",
    title: "Zollhof Impact Digital Twin",
    repo: null, // Team hackathon project, no public repo. Add a link here if the team publishes one.
    objective:
      "Score a startup's impact against recognised frameworks, inside an 8-hour hackathon build.",
    summary:
      "Built with my team in TypeScript at the Claude Impact Lab Hackathon in Nuremberg. One Claude Opus call returns a Zod-validated, multi-dimensional impact profile against the IMP framework, IRIS+ themes, and UN SDG targets, shipped live as a Vercel serverless API.",
    metricsLine:
      "Built in *8 hours*, with a single Claude Opus call producing each impact profile.",
    stack: ["TypeScript", "Claude Opus", "Zod", "Vercel serverless"],
    stats: [
      { value: "8h", label: "build window" },
      { value: "1", label: "Claude Opus call per profile" },
    ],
    topics: ["hackathon", "typescript", "llm", "impact-measurement"],
    media: { cover: "/img/missions/impact-twin.jpg" },
  },
  {
    slug: "heartbeat",
    number: "05",
    title: "Fetal Health Classification, ML Pipeline",
    repo: "Fetal_Health_Classification_using_Machine_Learning",
    objective:
      "Classify cardiotocography readings as Normal, Suspect, or Pathological without leaking test data.",
    summary:
      "Logistic Regression, Random Forest, and SVM compared, with SMOTE applied inside the training pipeline so nothing leaks into the test set.",
    metricsLine:
      "*94.6%* accuracy and *94.4%* F1 across Normal, Suspect and Pathological cases.",
    stack: ["Python", "scikit-learn", "SMOTE", "Random Forest"],
    stats: [
      { value: "94.6%", label: "accuracy" },
      { value: "94.4%", label: "F1" },
    ],
    topics: ["python", "machine-learning", "random-forest", "healthcare", "imbalanced-data"],
    media: { cover: "/img/missions/heartbeat.jpg" },
  },
  {
    slug: "stockpile",
    number: "06",
    title: "Cost-Aware Demand Forecasting",
    repo: "Cost-aware-demand-forecasting",
    objective:
      "Pick the forecasting model that minimises inventory cost, not the one with the best accuracy score.",
    summary:
      "ARIMA, SARIMA, and Prophet backtested on DataCo order data with an expanding window. Plain ARIMA won both categories on total inventory cost, because SARIMA's seasonal term overfit the smaller backtest windows.",
    metricsLine:
      "*3 models* backtested, and plain ARIMA won *both categories* on total inventory cost.",
    stack: ["Python", "ARIMA", "SARIMA", "Prophet", "Jupyter"],
    stats: [
      { value: "3", label: "models backtested" },
      { value: "2", label: "categories won by ARIMA" },
    ],
    topics: ["time-series", "supply-chain", "forecasting", "arima", "prophet", "demand-forecasting"],
    media: { cover: "/img/missions/stockpile.jpg" },
  },
];

export type ArchiveEntry = {
  repo: string;
  title: string;
  description: string;
  language: string;
  topics: string[];
  kind: "original" | "fork";
  forkOf?: string;
};

// Other public repositories. Forks are kept for reference but not shown.
export const archive: ArchiveEntry[] = [
  {
    repo: "Queueing-Simulation-and-Optimization-System",
    title: "Queueing Simulation and Optimization System",
    description:
      "Discrete-event M/M/c call-center simulation in SimPy that finds the lowest-cost staffing level still meeting the wait-time SLA, cross-checked against Erlang C.",
    language: "Python",
    topics: ["simulation", "optimization", "operations-research", "queueing-theory", "simpy"],
    kind: "original",
  },
  {
    repo: "ARIMA-time-series-forecasting",
    title: "ARIMA Time-Series Forecasting",
    description:
      "Single-file R pipeline for ARIMA forecasting of COVID-19 case data: order selection, stationarity tests, residual diagnostics, and a 30-day forecast with confidence bands.",
    language: "R",
    topics: ["statistics", "time-series", "forecasting", "arima", "box-jenkins"],
    kind: "original",
  },
  {
    repo: "Catapult_DOE",
    title: "Catapult DOE",
    description:
      "Catapult DOE study in R: measurement system analysis plus a full factorial run sheet, analysed in a tidy Quarto model.",
    language: "R",
    topics: ["statistics", "anova", "design-of-experiments", "quarto", "measurement-system-analysis"],
    kind: "original",
  },
  {
    repo: "Paper-Helicopter_DOE",
    title: "Paper Helicopter DOE",
    description:
      "Paper-helicopter DOE in R: full and fractional factorial designs on flight time, with ANOVA, model diagnostics, and optimal factor settings.",
    language: "R",
    topics: ["statistics", "anova", "design-of-experiments", "quarto", "fractional-factorial"],
    kind: "original",
  },
  {
    repo: "THE_FUTURE_OF_MANUFACTURING_IN_2040",
    title: "The Future of Manufacturing in 2040",
    description:
      "Quarto/LaTeX case-study report on what manufacturing looks like in 2040, with APA-numeric citations and a rendered PDF.",
    language: "TeX",
    topics: ["latex", "manufacturing", "case-study", "technical-report", "industry-40"],
    kind: "original",
  },
  // Forks.
  {
    repo: "RobotIQ",
    title: "RobotIQ",
    description: "Empowering mobile robots with human-level planning.",
    language: "Python",
    topics: [],
    kind: "fork",
    forkOf: "emmarapt/RobotIQ",
  },
  {
    repo: "ros-2025-thd",
    title: "ROS 2025 (THD coursework)",
    description: "Course homework repository for autonomous systems at THD.",
    language: "Dockerfile",
    topics: [],
    kind: "fork",
    forkOf: "THD-autonomous-system/ros-2023-thd",
  },
  {
    repo: "Roadmap-To-Learn-Generative-AI-In-2025",
    title: "Roadmap to Learn Generative AI in 2025",
    description: "Learning roadmap.",
    language: "",
    topics: [],
    kind: "fork",
    forkOf: "krishnaik06/Roadmap-To-Learn-Generative-AI-In-2025",
  },
  {
    repo: "Perfect-Roadmap-To-Learn-Data-Science-In-2025",
    title: "Roadmap to Learn Data Science in 2025",
    description: "Learning roadmap.",
    language: "",
    topics: [],
    kind: "fork",
    forkOf: "krishnaik06/Perfect-Roadmap-To-Learn-Data-Science-In-2025",
  },
  {
    repo: "Complete-Data-Science-With-Machine-Learning-And-NLP-2024",
    title: "Complete Data Science with ML and NLP",
    description: "Course notebooks.",
    language: "Jupyter Notebook",
    topics: [],
    kind: "fork",
    forkOf: "krishnaik06/Complete-Data-Science-With-Machine-Learning-And-NLP-2024",
  },
  {
    repo: "Quant-Finance-Resources",
    title: "Quant Finance Resources",
    description: "Courses, articles, and other material for learning quant finance.",
    language: "",
    topics: [],
    kind: "fork",
    forkOf: "PyPatel/Quant-Finance-Resources",
  },
];

export type SkillGroup = { group: string; items: string[] };

// Skills in four groups. Items are copied from the resume's Technical Skills.
export const skills: SkillGroup[] = [
  {
    group: "ML / Computer Vision",
    items: [
      "YOLOv12", "OpenCV", "CLIP", "Hugging Face Transformers", "Scikit-learn",
      "PyTorch", "TensorFlow", "Keras", "LoRA fine-tuning", "Diffusion Models",
    ],
  },
  {
    group: "MLOps & Infrastructure",
    items: [
      "Docker", "Kubernetes", "Terraform", "GitLab CI/CD", "Jenkins", "MLflow",
      "AWS (IoT Core, Lambda, CloudFormation)", "Grafana",
    ],
  },
  {
    group: "Edge & Embedded",
    items: ["Raspberry Pi 5", "ESP32", "MQTT", "CoAP", "REST API"],
  },
  {
    group: "Programming",
    items: [
      "Python (NumPy, Pandas, FastAPI)", "R", "PostgreSQL",
      "JavaScript / TypeScript", "HTML / CSS",
    ],
  },
];

export const education = [
  {
    school: "Technische Hochschule Deggendorf",
    place: "Cham, Germany",
    degree: "M.Eng in Applied AI for Digital Production Management",
    result: "Grade: 1.8",
    start: "Mar 2025",
    end: "Present",
  },
  {
    school: "SRM Institute of Science and Technology",
    place: "Chennai, India",
    degree: "B.Tech in Mechanical Engineering",
    result: "CGPA: 9.03",
    germanGrade: "1.4",
    start: "Jun 2019",
    end: "May 2023",
  },
] as const;

export const languages = [
  { language: "English", level: "Native" },
  { language: "German", level: "A2" },
] as const;

// The site collects nothing: no form, no analytics, no cookies. No address is published.
export const legal = {
  collectsData: false,
} as const;
