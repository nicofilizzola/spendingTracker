import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type DonutChartProps = {
  size?: number;
  strokeWidth?: number;
  progress: number;
  trackColor?: string;
  progressColor?: string;
  style?: StyleProp<ViewStyle>;
};

export default function DonutChart({
  size = 96,
  strokeWidth = 10,
  progress,
  trackColor = '#e6e6e6',
  progressColor = '#111111',
  style,
}: DonutChartProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * clamped;

  return (
    <Svg width={size} height={size} style={style}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={progressColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        fill="none"
        rotation={-90}
        originX={size / 2}
        originY={size / 2}
      />
    </Svg>
  );
}
