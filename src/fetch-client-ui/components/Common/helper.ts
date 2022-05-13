export const notesMaxLimit = 2500;
export function getDataFromHTML(data: string): string {
    let removedData: string;    
    removedData = data?.replace(/(<([^>]+)>)/gm, '');
    removedData = removedData?.replace(/(&nbsp;|&gt;|&lt;|&amp;)/gm, ' ');
    return removedData;
}