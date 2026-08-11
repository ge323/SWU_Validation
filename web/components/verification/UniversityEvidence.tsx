"use client";

import type { UniversityCode } from "../university/UniversitySelector";

import type { ExcelRow } from "../../lib/excel/parser";

import SwuEvidence from "./SwuEvidence";
import KonkukEvidence from "./KonkukEvidence";

type UniversityEvidenceProps = {
  university: UniversityCode;

  row: ExcelRow;

  status: string;
};

export default function UniversityEvidence({
  university,
  row,
  status,
}: UniversityEvidenceProps) {
  switch (university) {
    case "swu":
      return (
        <SwuEvidence
          row={row}
          status={status}
        />
      );

    case "konkuk":
      return (
        <KonkukEvidence
          row={row}
          status={status}
        />
      );

    case "snut":
      return (
        <EvidenceNotReady
          universityName="서울과학기술대학교"
        />
      );

    case "gachon":
      return (
        <EvidenceNotReady
          universityName="가천대학교"
        />
      );

    case "khu":
      return (
        <EvidenceNotReady
          universityName="경희대학교"
        />
      );

    default:
      return null;
  }
}

function EvidenceNotReady({
  universityName,
}: {
  universityName: string;
}) {
  return (
    <div className="empty-state evidence-empty">
      <strong>
        {universityName} 산출 근거 준비 중
      </strong>

      <p>
        해당 대학의 실제 성적 산출 파일과
        검증 규칙을 확인한 후 이 영역에
        산출 근거를 연결합니다.
      </p>
    </div>
  );
}