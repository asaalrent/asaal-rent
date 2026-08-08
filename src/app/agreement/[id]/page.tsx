"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import jsPDF from "jspdf";

export default function AgreementPage() {
  const { id } = useParams();

  const [agreement, setAgreement] = useState<any>(null);

  useEffect(() => {
    loadAgreement();
  }, []);

  async function loadAgreement() {
    const { data } = await supabase
      .from("rental_agreements")
      .select("*")
      .eq("booking_id", id)
      .single();

    setAgreement(data);
  }

  function downloadPDF() {
  const pdf = new jsPDF();

  pdf.setFontSize(18);
  pdf.text("ASAAL RENTAL AGREEMENT", 20, 20);

  pdf.setFontSize(11);

  const lines = pdf.splitTextToSize(
    agreement.agreement_text,
    170
  );

  pdf.text(lines, 20, 35);

  pdf.save("Asaal-Rental-Agreement.pdf");
}

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        background: "white",
        padding: "30px",
        borderRadius: "15px",
        boxShadow: "0 2px 15px rgba(0,0,0,.1)",
      }}
    >
      <h1>📄 Rental Agreement</h1>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.8,
          fontSize: "16px",
        }}
      >
        {agreement.agreement_text}
      </pre>
      <button
  onClick={downloadPDF}
  style={{
    marginTop: "20px",
    padding: "14px 25px",
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
  }}
>
  📥 Download PDF
</button>
    </div>
  );
}