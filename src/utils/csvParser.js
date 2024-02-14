import fs from 'fs';
import { parse } from 'csv-parse';

export const csvParser = async (filePath) => {
  const records = [];
  const parser = fs.createReadStream(filePath)
    .pipe(parse({ bom: true }))
    for await (const record of parser) {
      records.push(record);
    }
    return records; 
};