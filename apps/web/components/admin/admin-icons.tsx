import type { SVGProps } from 'react';

const paths = {
  overview: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-11h6V4h-6v5Z',
  users: 'M16 11a4 4 0 1 0-3.46-6 4 4 0 0 0 0 4A4 4 0 0 0 16 11ZM8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.31 0-6 1.57-6 3.5V20h12v-2.5C14 15.57 11.31 14 8 14Zm8 0c-.45 0-.89.03-1.31.09.82.72 1.31 1.61 1.31 2.66V20h6v-2.5c0-1.93-2.69-3.5-6-3.5Z',
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z',
  shield: 'M12 2 5 5v6c0 4.55 2.91 8.53 7 10 4.09-1.47 7-5.45 7-10V5l-7-3Z',
  message: 'M4 5h16v11H7l-3 3V5Z',
  money: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2H8v-2h5a1 1 0 0 0 0-2h-2a3 3 0 0 1 0-6V3h2v2h3v2h-5a1 1 0 0 0 0 2h2a3 3 0 0 1 0 6v2Z',
  chart: 'M4 19h16v2H2V3h2v16Zm3-2V9h3v8H7Zm5 0V5h3v12h-3Zm5 0v-6h3v6h-3Z',
  file: 'M6 2h8l4 4v16H6V2Zm7 1.5V7h3.5L13 3.5ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z',
  warning: 'M12 2 1 21h22L12 2Zm1 16h-2v-2h2v2Zm0-4h-2V8h2v6Z',
  search: 'M10 4a6 6 0 1 0 3.65 10.76L19 20.1 20.1 19l-5.34-5.35A6 6 0 0 0 10 4Z',
  logout: 'M10 4H4v16h6v-2H6V6h4V4Zm5.5 4.5L14.1 9.9l2.1 2.1H9v2h7.2l-2.1 2.1 1.4 1.4L20 13l-4.5-4.5Z',
  dashboard: 'M3 4h8v7H3V4Zm10 0h8v4h-8V4ZM3 13h8v7H3v-7Zm10-3h8v10h-8V10Z',
  bell: 'M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-5-2-2v-5a5 5 0 0 0-4-4.9V3h-2v2.1A5 5 0 0 0 7 10v5l-2 2v1h14v-1Z',
  heart: 'M12 21s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.83A4.5 4.5 0 0 1 20 10c0 6.3-8 11-8 11Z',
  user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-8 9a8 8 0 0 1 16 0H4Z',
};

export type AdminIconName = keyof typeof paths;

export function AdminIcon({ name, className, ...props }: SVGProps<SVGSVGElement> & { name: AdminIconName }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}
