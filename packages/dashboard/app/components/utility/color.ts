export const evaluateHexColor = (color: string, opacity: number) => {
    const hexColor = color.replace('#', '');
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const evaluateColorStatus = (value: number): string => {
    if (value < 0.0 || value > 1.0) {
        throw new Error('Value must be between 0.0 and 1.0');
    }

    const low = '#10B981'; // Green
    const medium = '#F59E0B'; // Yellow
    const high = '#EF4444'; // Red

    if (value < 0.5) {
        return low;
    } else if (value < 0.8) {
        return medium;
    } else {
        return high;
    }
}

export const evaluateColorOn = (value: boolean): string => {
    return value ? '#10B981' : '#EF4444';
}