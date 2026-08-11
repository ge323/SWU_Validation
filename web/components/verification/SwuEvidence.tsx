"use client";

import {
  EvidenceFlowArrow,
  EvidenceFlowItem,
  EvidenceItem,
  getRowValue,
  type EvidenceProps,
} from "./EvidenceCommon";

export default function SwuEvidence({
  row,
  status,
}: EvidenceProps) {
  return (
    <>
      <div className="verification-flow">
        <EvidenceFlowItem
          number="1"
          title="기본 정보"
          description="전형·모집단위와 학생부 기준 확인"
        />

        <EvidenceFlowArrow />

        <EvidenceFlowItem
          number="2"
          title="우수학기 선정"
          description="산출 대상 학기 중 우수학기 선택"
        />

        <EvidenceFlowArrow />

        <EvidenceFlowItem
          number="3"
          title="등급·점수 반영"
          description="우수학기별 반영등급과 점수 확인"
        />

        <EvidenceFlowArrow />

        <EvidenceFlowItem
          number="4"
          title="최종 계산"
          description="최종등급과 학생부점수 비교"
        />
      </div>

      <div className="evidence-detail-grid">
        <EvidenceItem
          label="학생부점수 만점"
          value={getRowValue(
            row,
            "학생부점수만점"
          )}
        />

        <EvidenceItem
          label="적용 계산식"
          value={getRowValue(
            row,
            "적용계산식"
          )}
        />

        <EvidenceItem
          label="산출 학기수"
          value={getRowValue(
            row,
            "산출학기수"
          )}
        />

        <EvidenceItem
          label="우수학기 선정수"
          value={getRowValue(
            row,
            "우수학기선정수"
          )}
        />

        <EvidenceItem
          label="우수학기1 반영점수"
          value={getRowValue(
            row,
            "우수학기1_반영학생부점수",
            "우수학기1반영학생부점수"
          )}
        />

        <EvidenceItem
          label="우수학기2 반영점수"
          value={getRowValue(
            row,
            "우수학기2_반영학생부점수",
            "우수학기2반영학생부점수"
          )}
        />

        <EvidenceItem
          label="최종 등급"
          value={getRowValue(
            row,
            "우수2개학기_최종등급",
            "우수2개학기최종등급"
          )}
        />

        <EvidenceItem
          label="최종 학생부점수"
          value={getRowValue(
            row,
            "최종_학생부점수",
            "최종학생부점수"
          )}
        />

        <EvidenceItem
          label="실제 반영 점수"
          value={getRowValue(
            row,
            "실제반영_학생부점수",
            "실제반영학생부점수"
          )}
        />

        <EvidenceItem
          label="최종 상태"
          value={status}
        />
      </div>
    </>
  );
}