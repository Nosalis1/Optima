type Props = {
    type?: 'horizontal' | 'vertical';
}

export default function Separator({ type = 'horizontal' }: Props) {
    return (
        <div className={`w-full ${type === 'horizontal' ? 'h-px my-2' : 'h-full w-px mx-2'} bg-gray-300 dark:bg-gray-700`} />
    );
}