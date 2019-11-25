import * as React from 'react';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import Filter from '../../containers/Filter';

/** interface for Form URL params */
interface ListURLParams {
  id: string;
}

interface ListState {
  filterDefinition: any;
  tableDefinition: any;
}

class List extends React.Component<RouteComponentProps<ListURLParams>, ListState> {
  public render() {
    return (
      <div>
        <Link to="/">
          <h1>Back</h1>
        </Link>
        <Filter />
      </div>
    );
  }
}

export default withRouter(List);
