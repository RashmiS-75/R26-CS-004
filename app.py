# app.py
# Audixa - Intelligent Firewall Log Risk Scoring Engine
# Professional Dashboard

import streamlit as st
import pandas as pd
import joblib
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from src.risk_scorer import calculate_risk_score

# ====================== Page Config ======================
st.set_page_config(
    page_title="Audixa | Risk Scoring Engine",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ====================== Custom CSS (Matching Reference) ======================
st.markdown("""
<style>
    /* Background */
    .stApp {
        background-color: #F8F7F4;
    }

    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: #2F3A1E;
    }
    [data-testid="stSidebar"] * {
        color: #F5F0E6 !important;
    }

    /* Headers */
    h1, h2, h3 {
        color: #1A1A1A !important;
        font-weight: 700;
    }

    /* Metric cards style */
    [data-testid="stMetric"] {
        background-color: white;
        padding: 18px 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        border: 1px solid #E8E4DC;
    }

    /* Download button */
    .stDownloadButton button {
        background-color: #6B7C3A;
        color: white;
        border-radius: 8px;
        font-weight: 600;
        border: none;
        padding: 0.5rem 1.2rem;
    }
    .stDownloadButton button:hover {
        background-color: #4A5C2E;
        color: white;
    }

    /* General text */
    p, label {
        color: #333333;
    }
</style>
""", unsafe_allow_html=True)

# ====================== Load Model ======================
@st.cache_resource
def load_assets():
    model = joblib.load("models/best_risk_model.pkl")
    try:
        shap_importance = joblib.load("models/shap_importance.pkl")
    except:
        shap_importance = None
    return model, shap_importance

model, shap_importance = load_assets()

# ====================== Sidebar ======================
with st.sidebar:
    st.markdown("## 🛡️ Audixa")
    st.markdown("**Security Audit Analytics Platform**")
    st.markdown("---")
    st.markdown("### Risk Scoring Module")
    
    uploaded_file = st.file_uploader("Upload Processed Log CSV", type=["csv"])
    
    st.markdown("---")
    st.markdown("""
    **Expected Features**  
    `proto, action, service, utmaction, duration, sentbyte, rcvdbyte, sentpkt, rcvdpkt, trandisp, bytes_total, pkt_total, pkt_ratio`
    """)
    st.markdown("---")
    st.caption("Component 2 • R26-CS-004")

# ====================== Main Header ======================
st.markdown("## Intelligent Firewall Log Risk Scoring Engine")
st.caption("Audixa | Risk = Probability × Impact × 100")

# ====================== Main Content ======================
if uploaded_file is not None:
    try:
        df = pd.read_csv(uploaded_file)

        if 'label' in df.columns:
            X = df.drop(columns=['label'])
        else:
            X = df.copy()

        expected_features = [
            'proto', 'action', 'service', 'utmaction', 'duration',
            'sentbyte', 'rcvdbyte', 'sentpkt', 'rcvdpkt', 'trandisp',
            'bytes_total', 'pkt_total', 'pkt_ratio'
        ]

        available = [c for c in expected_features if c in X.columns]

        if len(available) < 5:
            st.error("Not enough required features found in the uploaded file.")
            st.stop()

        X = X[available].fillna(X.median(numeric_only=True))

        with st.spinner("Calculating Risk Scores..."):
            results = calculate_risk_score(model, X, shap_importance)

        final_df = pd.concat([X.reset_index(drop=True), results], axis=1)

        # ===== Top Metrics =====
        total = len(final_df)
        critical = len(final_df[final_df['risk_level'] == "Critical"])
        high = len(final_df[final_df['risk_level'] == "High"])
        medium = len(final_df[final_df['risk_level'] == "Medium"])
        low = len(final_df[final_df['risk_level'] == "Low"])

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Total Logs", f"{total:,}")
        c2.metric("Critical Risk", f"{critical:,}", delta=f"{(critical/total*100):.1f}%")
        c3.metric("High Risk", f"{high:,}", delta=f"{(high/total*100):.1f}%")
        c4.metric("Low + Medium", f"{(low+medium):,}")

        st.markdown("---")

        # ===== Charts =====
        left, right = st.columns(2)

        with left:
            st.subheader("Risk Level Distribution")
            risk_counts = final_df['risk_level'].value_counts().reset_index()
            risk_counts.columns = ['Risk Level', 'Count']

            fig = px.pie(
                risk_counts,
                values='Count',
                names='Risk Level',
                color='Risk Level',
                color_discrete_map={
                    'Critical': '#E74C3C',
                    'High': '#E67E22',
                    'Medium': '#F1C40F',
                    'Low': '#27AE60'
                },
                hole=0.55
            )
            fig.update_layout(
                margin=dict(t=30, b=30, l=20, r=20),
                height=360,
                showlegend=True
            )
            st.plotly_chart(fig, use_container_width=True)

        with right:
            st.subheader("Risk Score Distribution")
            fig2 = px.histogram(
                final_df,
                x="risk_score",
                nbins=30,
                color_discrete_sequence=['#6B7C3A']
            )
            fig2.update_layout(
                xaxis_title="Risk Score (0–100)",
                yaxis_title="Number of Logs",
                margin=dict(t=30, b=30, l=20, r=20),
                height=360
            )
            st.plotly_chart(fig2, use_container_width=True)

        # ===== High Risk Table =====
        st.subheader("High & Critical Risk Logs")
        high_risk_df = final_df[final_df['risk_level'].isin(["High", "Critical"])]

        if len(high_risk_df) > 0:
            st.dataframe(
                high_risk_df[['probability', 'impact', 'risk_score', 'risk_level']].head(50),
                use_container_width=True
            )
        else:
            st.info("No High or Critical risk logs found in this file.")

        # ===== Download =====
        csv = final_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="Download Full Risk Scoring Results",
            data=csv,
            file_name="audixa_risk_scores.csv",
            mime="text/csv"
        )

    except Exception as e:
        st.error(f"Error processing file: {str(e)}")

else:
    st.info("Upload a processed firewall log CSV file to begin risk scoring.")
    
    st.markdown("""
    ### How Audixa Risk Scoring Works
    - **Probability** → Predicted by the trained Machine Learning model  
    - **Impact** → Calculated using SHAP feature importance  
    - **Risk Score** = Probability × Impact × 100  
    - **Risk Levels**: Low | Medium | High | Critical  
    """)