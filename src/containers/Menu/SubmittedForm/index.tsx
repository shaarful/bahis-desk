import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { Link } from 'react-router-dom';
// import { Card, CardBody, CardTitle } from 'reactstrap';
import { getNativeLanguageText } from '../../../helpers/utils';
import { ListMenu } from '../../../store/ducks/menu';
import { ipcRenderer } from '../../../services/ipcRenderer';
import { menuStyle } from '../style';
import { makeStyles, Typography, useTheme } from '@material-ui/core';

export interface ListMenuItemProps {
  menuItem: ListMenu;
  appLanguage: string;
}

function ListMenuItem(props: ListMenuItemProps) {
  // class ListMenuItem extends React.Component<ListMenuItemProps> {
  const [imageSource, setImageSource] = React.useState<string>('');

  const compUpdate = async () => {
    if (props.menuItem.img_id.toString().length > 5) {
      const image: any = await ipcRenderer.sendSync('fetch-image', props.menuItem.name);
      console.log('divisionList', image.replaceAll('\\', '/'));
      setImageSource(image.replaceAll('\\', '/'));
    }
  };

  React.useEffect(() => {
    compUpdate();
  }, []);

  const { menuItem, appLanguage } = props;

  
  const theme = useTheme();
  const useStyles = makeStyles(menuStyle(theme));
  const classes = useStyles();
  
  return (
    <Link to={`/list/${menuItem.list_id}/`}>
      <div className={classes.outerCircle}>
        <div className={classes.innerDiv}>
              <div className={classes.circle}>
                <div className={classes.image}>
                {navigator.onLine && imageSource.length ? (
                  <img
                    src={
                      imageSource
                        ? require(`../../../../${imageSource}`)
                        : require('../../../../src/assets/images/logo.png')
                    }
                    className={classes.iconClass}
                    alt={props.menuItem.name}
                  />
                ) : (
                  <FontAwesomeIcon icon={['far', 'list-alt']} size="4x" />
                )}
              </div>
              </div>
              <Typography variant="body1" color={'textPrimary'}>
                {getNativeLanguageText(menuItem.label, appLanguage)}
              </Typography>
        </div>
      </div>
    </Link>  
  );
}

export default ListMenuItem;
