import { Accordion, AccordionActions, AccordionDetails, AccordionSummary, TableContainer, TablePagination, Button,  Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';
import reducerRegistry from '@onaio/redux-reducer-registry';
import * as React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Col, Row } from 'reactstrap';
import { Store } from 'redux';
import { ipcRenderer } from '../../services/ipcRenderer';
import ListTableReducer, {
  getAllColumnsValueObj,
  getPageNumber,
  getPageSize,
  getTotalRecords,
  reducerName as ListTableReducerName,
  resetListTable,
  setPageNumber,
  setPageSize,
  setTotalRecords,
} from '../../store/ducks/listTable';
import Export from './Export';
import './ListTable.css';
import LookUp from './LookUp';
import OrderBy from './OrderBy';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
// import EnhancedTable from './Table';

// export interface LookupListCondition {
//   type: 'list';
//   name: string;
//   column: string;
// }

// export interface LookupStaticCondition {
//   type: 'static';
//   name: string;
//   value: string;
// }

export interface LookupDefinition {
  table_name: string;
  return_column: string;
  column_name: string;
  query: any,
  condition: any;
  datasource: any;
}

export interface ColumnObj {
  sortable: true | false;
  label: { [key: string]: string };
  field_name: string;
  format: string;
  data_type: string;
  lookup_definition?: LookupDefinition;
  exportable: boolean;
  hidden?: boolean;
}

export interface MappingObj {
  column: string;
  form_field: string;
}

export interface ActionDefinition {
  details_pk?: string,
  form_title: string,
  xform_id: number;
  data_mapping: MappingObj[];
  action_type: string;
  label: { [key: string]: string };
  formData?: string;
}

export interface ActionColumnObj {
  action_definition: ActionDefinition[];
  data_type: 'action';
  label: { [key: string]: string };
  hidden: boolean;
}

/** typeguard to differentiate between ColumnObj and ActionColumnObj */
export const isColumnObj = (obj: ColumnObj | ActionColumnObj): obj is ColumnObj => {
  return obj.data_type !== 'action'
};

interface DataSourceObj {
  type: string;
  query: string;
  config_json: any;
}

export interface ListTableProps {
  columnDefinition: Array<ColumnObj | ActionColumnObj>;
  datasource: DataSourceObj;
  filters: any;
  orderSql: string;
  listId: string;
  resetListTableActionCreator: typeof resetListTable;
  pageSize: number;
  pageNumber: number;
  totalRecords: number;
  setPageSizeActionCreator: typeof setPageSize;
  setPageNumberActionCreator: typeof setPageNumber;
  setTotalRecordsActionCreator: typeof setTotalRecords;
}

/** state inteface for ListTable */
export interface ListTableState {
  tableData: Array<{ [key: string]: any }>;
  lookupTables: any;
  filters: any;
  orderSql: string;
  pageNumber: number;
  rowsPerPage: number;
  page: number;
}

/** register the filter reducer */
reducerRegistry.register(ListTableReducerName, ListTableReducer);

class ListTable extends React.Component<ListTableProps, ListTableState> {
  constructor(props: ListTableProps) {
    super(props);
    this.state = { tableData: [], filters: {}, orderSql: '', pageNumber: 1, lookupTables: {}, rowsPerPage: 5, page: 0 };
  }

  public async componentDidMount() {
    const {
      datasource,
      filters,
      resetListTableActionCreator,
      setPageSizeActionCreator,
      setPageNumberActionCreator,
      setTotalRecordsActionCreator,
      columnDefinition,
    } = this.props;
    resetListTableActionCreator();
    setPageSizeActionCreator(5);
    setPageNumberActionCreator(1);
    const randomTableName = 'tab' + Math.random().toString(36).substring(2, 12);
    const totalRecordsResponse = await ipcRenderer.sendSync(
      'fetch-query-data',
      datasource.type === '0'
        ? `select count(*) as count from ${datasource.query}`
        : `with ${randomTableName} as (${datasource.query}) select count(*) as count from ${randomTableName}`,
    );
    setTotalRecordsActionCreator(totalRecordsResponse[0].count);
    const response = await ipcRenderer.sendSync(
      'fetch-query-data',
      datasource.type === '0'
        ? `select count(*) as count from ${datasource.query} limit ${5} offset 0`
        : `with ${randomTableName} as (${datasource.query}) select * from ${randomTableName} limit ${5} offset 0`,
    );
    const lookupTables: any = {};
    await columnDefinition.forEach(async (column) => {
      if (isColumnObj(column) && column.data_type === 'lookup') {

        if('lookup_definition' in column && column.lookup_definition) {

          let conditions = '';
          for(let i=0; i<column.lookup_definition.condition.length; i++) {
            if(i !==0) conditions+= ' and ';
            conditions += ` list_table.${column.lookup_definition.condition[i].column} = lookup_table.${column.lookup_definition.condition[i].name}`;
          }
          const query = `with list_table as ( 
              ${datasource.query}
            ), lookup_table as (
              ${column.lookup_definition.query}
            ) select
              list_table.id,
              lookup_table.${column.lookup_definition.return_column}
            from list_table left join lookup_table on ${conditions}`;
          
          console.log('--------------- lookup query ------------------');
          console.log(query);
          const resp = await ipcRenderer.sendSync('fetch-query-data', query);
          lookupTables[column.lookup_definition.return_column] = resp;

        }
      }
    });
    this.setState({ ...this.state, tableData: response || [], filters, lookupTables });
  }

  public async componentDidUpdate() {
    const {
      datasource,
      filters,
      orderSql,
      pageNumber,
      pageSize,
      setTotalRecordsActionCreator,
      setPageNumberActionCreator,
    } = this.props;
    const stateFilters = this.state.filters;
    const stateOrderSql = this.state.orderSql;
    const statePageNumber = this.state.pageNumber;
    const orderSqlTxt = orderSql !== '' ? ` ORDER BY ${orderSql}` : '';
    const randomTableName = 'tab' + Math.random().toString(36).substring(2, 12);
    if (filters !== stateFilters || orderSql !== stateOrderSql || pageNumber !== statePageNumber) {
      const newPageNumber = filters !== stateFilters || orderSql !== stateOrderSql ? 1 : pageNumber;
      if (filters !== stateFilters) {
        const totalRecordsResponse = await ipcRenderer.sendSync(
          'fetch-query-data',
          datasource.type === '0'
            ? 'select count(*) as count from ' + datasource.query + this.generateSqlWhereClause(filters)
            : `with ${randomTableName} as (${datasource.query}) select count(*) as count from ${randomTableName}` +
                this.generateSqlWhereClause(filters),
        );
        setTotalRecordsActionCreator(totalRecordsResponse[0].count);
      }
      const response = await ipcRenderer.sendSync(
        'fetch-query-data',
        datasource.type === '0'
          ? 'select * from ' +
              datasource.query +
              this.generateSqlWhereClause(filters) +
              orderSqlTxt +
              ` limit ${pageSize} offset ${(pageSize * (newPageNumber - 1))}`
          : `with ${randomTableName} as (${datasource.query}) select * from ${randomTableName}` +
              this.generateSqlWhereClause(filters) +
              orderSqlTxt +
              ` limit ${pageSize} offset ${(pageSize * (newPageNumber - 1))}`,
      );
      setPageNumberActionCreator(newPageNumber);
      this.setState({
        ...this.state,
        filters,
        orderSql,
        pageNumber: newPageNumber,
        tableData: response || [],
      });
    }
  }

  public render() {
    const { columnDefinition, datasource, filters, orderSql } = this.props;
    const { lookupTables } = this.state;
    const appLanguage = 'English';
    const orderSqlTxt = orderSql !== '' ? ` ORDER BY ${orderSql}` : '';
    const randomTableName = 'tab' + Math.random().toString(36).substring(2, 12);
    const query =
      datasource.type === '0'
        ? 'select * from ' + datasource.query + this.generateSqlWhereClause(filters) + orderSqlTxt
        : `with ${randomTableName} as (${datasource.query}) select * from ${randomTableName}` +
          this.generateSqlWhereClause(filters) +
          orderSqlTxt;
    
    console.log('lookup tables: ', {lookupTables});
    return (
      <div style={{ marginBottom: 20 }}>
        <Row>
          <Col>
            <span className="float-right csv-export">
              <Export query={query} appLanguage={appLanguage} colDefifinition={columnDefinition} />
            </span>
          </Col>
        </Row>
        <Accordion defaultExpanded>
          <AccordionSummary  expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1a-content"
              id="panel1a-header"
              >
                  ListTable
          </AccordionSummary>
          <AccordionDetails style={{ display: 'contents' }}>
            <div style={{ padding: 15 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      {columnDefinition.map((singleCol: ColumnObj | ActionColumnObj, index: number) => {
                        if (isColumnObj(singleCol)) {
                          return (
                            <TableCell key={'col-label-' + index} className="initialism text-uppercase text-nowrap">
                              {singleCol.sortable ? (
                                <OrderBy colDefifinitionObj={singleCol} appLanguage={appLanguage} />
                              ) : (
                                singleCol.label[appLanguage]
                              )}
                            </TableCell>
                          );
                        } else {
                          return (
                            <TableCell  colSpan={singleCol.action_definition.length } key={'col-label-' + index} style={{ textAlign: 'center' }} className="initialism text-uppercase text-nowrap">
                              {singleCol.label[appLanguage]}
                            </TableCell>
                          );
                        }
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {this.state &&
                      this.state.tableData &&
                      this.state.tableData.map((rowObj, rowIndex: number) => (
                        <TableRow key={'table-row-' + rowIndex}>
                          {columnDefinition.map((colObj: ColumnObj | ActionColumnObj, colIndex: number) =>
                            isColumnObj(colObj) ? (
                              <TableCell key={'data-field-' + colIndex}>
                                {colObj.data_type === 'lookup' ? (
                                  <LookUp
                                    columnDef={colObj}
                                    rowValue={rowObj}
                                    lookupTable={lookupTables}
                                  />
                                ) : (
                                  rowObj[colObj.field_name]
                                )}
                              </TableCell>
                            ) : (
                              <TableCell key={'data-field-' + colIndex} colSpan={colObj.action_definition.length } style={{ display: 'flex'}}>
                                {colObj.action_definition.map((actionObj: ActionDefinition, actionIndex: number) => {
                                  return(
                                    <React.Fragment key={'action-field' + actionIndex}>
                                      {
                                        actionObj.action_type === 'details' ? (
                                          <Link key={'action-field' + actionIndex} to={`/listProfile/${this.props.listId}/?dataJson=${btoa(JSON.stringify(rowObj))}&detailspk=${actionObj.details_pk}`}
                                        >
                                          <Button  variant="contained" color={'secondary'} style={{ color: '#EBFDED', marginRight: 5, whiteSpace: 'nowrap' }}> {actionObj.label[appLanguage]} </Button>
                                        </Link>
                                        ) : (
                                          <Link key={'action-field' + actionIndex} to={`/form/${actionObj.xform_id}/?dataJson=${this.mapListToFormData(
                                            actionObj.data_mapping,
                                            rowObj,
                                          )}`}
                                        >
                                          <Button  variant="contained" color={'secondary'} style={{ color: '#EBFDED', marginRight: 5, whiteSpace: 'nowrap' }}> {actionObj.label[appLanguage]} </Button>
                                        </Link>
                                        )
                                      }
                                    </React.Fragment>
                                  )
                                })}
                              </TableCell>
                            ),
                          )}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </AccordionDetails>
          <AccordionActions>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={this.props.totalRecords}
              rowsPerPage={this.state.rowsPerPage}
              page={this.state.page}
              onChangePage={this.handleChangePage}
              onChangeRowsPerPage={this.handleChangeRowsPerPage}
            />
          </AccordionActions>
        </Accordion>
      </div>
    );
  }

  private handleChangePage = (event: unknown, newPage: number) => {
    // setPage(newPage);
    console.log(event);
    this.props.setPageNumberActionCreator(newPage + 1);
    this.setState({
      page: newPage,
    })
  };

  private handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.props.setPageSizeActionCreator(parseInt(event.target.value, 10));
    this.props.setPageNumberActionCreator(1);
    this.setState({
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0,
    });
    // setRowsPerPage(parseInt(event.target.value, 10));
    // setPage(0);
  };


  private generateSqlWhereClause = (filters: any) => {
    let sqlWhereClause = '';
    Object.keys(filters).forEach((filterName) => {
      if (filters[filterName].sql !== '') {
        sqlWhereClause = `${sqlWhereClause} and ${filters[filterName].sql}`;
      }
    });
    return sqlWhereClause !== '' ? ' where ' + sqlWhereClause.substring(4) : '';
  };

  private mapListToFormData = (mapping: MappingObj[], listRowData: { [key: string]: any }): any => {
    const preFormJsn: any = {};
    mapping.forEach((item: MappingObj) => {
      preFormJsn[item.form_field] = listRowData[item.column];
    });
    return btoa(JSON.stringify(preFormJsn));
  };
}

/** connect the component to the store */

/** Interface to describe props from mapStateToProps */
interface DispatchedStateProps {
  orderSql: string;
  pageSize: number;
  pageNumber: number;
  totalRecords: number;
}

/** Map props to state  */
const mapStateToProps = (state: Partial<Store>): DispatchedStateProps => {
  const columnsValue = getAllColumnsValueObj(state);
  const firstColumnName = Object.keys(columnsValue)[0] || null;
  const result = {
    orderSql: firstColumnName ? columnsValue[firstColumnName].orderSql : '',
    pageNumber: getPageNumber(state),
    pageSize: getPageSize(state),
    totalRecords: getTotalRecords(state),
  };
  return result;
};

/** map props to actions */
const mapDispatchToProps = {
  resetListTableActionCreator: resetListTable,
  setPageNumberActionCreator: setPageNumber,
  setPageSizeActionCreator: setPageSize,
  setTotalRecordsActionCreator: setTotalRecords,
};

/** connect ListTable to the redux store */
const ConnectedListTable = connect(mapStateToProps, mapDispatchToProps)(ListTable);

export default ConnectedListTable;
