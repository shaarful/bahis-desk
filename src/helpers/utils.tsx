import { ipcRenderer } from '../services/ipcRenderer';
import * as XLSX from 'xlsx';
import _ from 'lodash';

/** Interface for an object that is allowed to have any property */
export interface FlexObject {
  [key: string]: any;
}
const SELECT_ALL: string = 'select all that apply';
const SELECT_ONE = 'select one';

/**
 * returns the desired language text using identifier or empty text
 * @param {FlexObject} multiLanguageObject - the multi language object
 * @param {string} languageIdentifier - the language identifier
 * @returns {string} - the native language text
 */
export function getNativeLanguageText(multiLanguageObject: FlexObject, languageIdentifier: string) {
  return multiLanguageObject[languageIdentifier] || '';
}

export const appSync = async () => {
  const user: any = await ipcRenderer.sendSync('fetch-username');
  await ipcRenderer.send('start-app-sync', user.username);
  ipcRenderer.on('formSyncComplete', async function (event: any, args: any) {
    console.log('check', event, args);
    return args;
    // if (args == 'done') {
    //   return true;
    // } else {
    //   return false;
    // }
  });
};

export const dataSync = async () => {
  const user: any = await ipcRenderer.sendSync('fetch-username');
  await ipcRenderer.send('request-data-sync', user.username);
  ipcRenderer.on('dataSyncComplete', async function (event: any, args: any) {
    console.log('check', event, args);
    return args;
  });
};

export const exportToExcel = (tableData: any, filteredColumns: any, language: string) => {
  const filter = filteredColumns.map((a: { field_name: string; }) => a.field_name);
  const labels = filteredColumns.map((a: any) => a.label[language]);
  const excelDataList = tableData.map((a: any) => _.pick(a, filter));
  const excelData: any = excelDataList.map((obj: any) => {
    const newObj: any = {};
    for (let i =0 ; i< filter.length; i++) {
      newObj[labels[i]] = obj[filter[i]];
    }
    return newObj;
  });
  // const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = { Sheets: { data: ws }, SheetNames: ['data'] };
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  // const data = new Blob([excelBuffer], { type: fileType });
  ipcRenderer.send('export-xlsx', excelBuffer);
  // FileSaver.saveAs(data, 'UserStatistics' + '.xlsx');
};

export const exportToExcelForSubmittedData = (tableData: any, filteredColumns: any, choiceList: any) => {
  const excelData = [];
  let excelTabs: any = {};
  console.log(filteredColumns, tableData, choiceList);
  for(let row of tableData) {
  
    const data = JSON.parse(row.data);
    let newRow = {['instance id']: row.instanceid};
    for(let k of Object.keys(data)) {

      const xlTab = filteredColumns[k];
      if(xlTab && xlTab.type !== SELECT_ALL) {

        let readableValue = '';
        if(xlTab.fieldElement)
          readableValue = getReadableValue(data[k], xlTab.fieldElement, choiceList);
        else 
          readableValue = data[k];

        newRow = { ...newRow, [ xlTab.label ]: readableValue }
      } else if(xlTab) {
        if(!Object.keys(excelTabs).includes(xlTab.label)) {
          excelTabs = {...excelTabs, [xlTab.label]: []}
        }
        //the pop function will remove the trailing space
        const multipleAns =  data[k].substring(0, data[k].length - 1);
        const result = multipleAns.split(' ').map((item: any) => ({ ['instance id']: row.instanceid, value: getReadableValue(item, xlTab.fieldElement, choiceList) }));
        excelTabs[xlTab.label] = excelTabs[xlTab.label].concat(result);
      }
    }
    // console.log(newRow);
    // console.log(excelTabs);
    excelData.push(newRow);
  }
  for(let item of Object.keys(excelTabs)) {
    excelTabs[item] = XLSX.utils.json_to_sheet(excelTabs[item]);
  }
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = { Sheets: { data: ws, ...excelTabs}, SheetNames: ['data', ...Object.keys(excelTabs)] };
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  // const data = new Blob([excelBuffer], { type: fileType });
  ipcRenderer.send('export-xlsx', excelBuffer);
  // FileSaver.saveAs(data, 'UserStatistics' + '.xlsx');
};


const getReadableValue = (fieldValue: any, formField: any, choices: any) => {

  //  it means that value has been selected from csv-list.
  if (formField && formField.control && formField.control.appearance && formField.control.appearance.includes('search')) {
    const processedStringArray = formField.control.appearance.match(
      /\([^\)]+\)/i
    ) || [''];
    let params = processedStringArray[0];

    if (params.length > 2) {
      params = params.substring(1, params.length - 1);
      const csvName = params.split(',')[0].replaceAll('\'', '');
      
      console.log(formField, fieldValue);
      const csvChoices = choices.formChoices[`${csvName}.csv`];
      console.log('--------------choices -------------------');
      console.log(csvChoices);
      console.log('--------csvname :', csvName);
      let result = csvChoices.find((option: any)=> String(option[formField.children[0].name]).trim() == String(fieldValue).trim());
      console.log('--------result :', result);
      if(result === undefined) return ' -- ';
      else {
        result = result[formField.children[0].label['English']];
        return result;
      }
    }
  } 
  else if(formField.type === SELECT_ONE || formField.type === SELECT_ALL) {
    // console.log('----------in select one -----------------');
    // console.log(fieldValue, formField);
    for (let i=0; i<choices.simpleFormChoice.length; i++) {
      const choice = choices.simpleFormChoice[i];

      if( choice.field_name.includes(formField.name) && String(choice.value_text).trim() == String(fieldValue).trim()) {
        console.log("-->>> choice value_label: ", choice.value_label);

        choice.value_label = typeof choice.value_label === 'string' ?  JSON.parse(choice.value_label) : choice.value_label 
    
        if(typeof choice.value_label === 'string') return choice.value_label;
        else if(typeof choice.value_label === 'object') {
          
          return choice.value_label.English;
        }
      }
    }
  } 
  else {
    return typeof fieldValue == 'string' ? fieldValue : JSON.stringify(fieldValue);
  }
}