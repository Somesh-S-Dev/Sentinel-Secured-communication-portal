import { ChannelType, Severity } from '@prisma/client';
import prisma from '../config/prisma';

const PREFIX_MAP: Record<ChannelType, string> = {
  GENERAL:     'GEN',
  HR:          'HR',
  SAFETY:      'SAF',
  POLICY:      'POL',
  IT_SECURITY: 'ITS',
  LEGAL:       'LGL',
};

export async function generateCaseNumber(channelType: ChannelType): Promise<string> {
  const prefix = PREFIX_MAP[channelType] ?? 'GEN';
  const year   = new Date().getFullYear();
  const count  = await prisma.report.count({
    where: { channel: { type: channelType } },
  });
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

export function getSeverityWeight(severity: Severity): number {
  const weights: Record<Severity, number> = {
    CRITICAL: 4,
    HIGH:     3,
    MEDIUM:   2,
    INFO:     1,
  };
  return weights[severity];
}
