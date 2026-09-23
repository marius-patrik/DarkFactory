import type { FC } from "react";

export interface PlaceholderViewProps {
  title: string;
  description: string;
}

export const PlaceholderView: FC<PlaceholderViewProps> = ({ title, description }) => (
  <div>
    <h2>{title}</h2>
    <p>{description}</p>
    <div className="status-badge status-disconnected">Disconnected Surface</div>
  </div>
);
