import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import { setActiveAccount } from './state/slices/account';
import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom';
import { setAlertModal } from './state/slices/application';
import classes from './App.module.css';
import '../src/css/globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import AlertModal from './components/Modal';
import NavBar from './components/NavBar';
import NetworkAlert from './components/NetworkAlert';
import Footer from './components/Footer';
import AuctionPage from './pages/Auction';
import GovernancePage from './pages/Governance';
import CreateProposalPage from './pages/CreateProposal';
import VotePage from './pages/Vote';
import AlpersPage from './pages/Alpers';
import NotFoundPage from './pages/NotFound';
import Playground from './pages/Playground';
import { CHAIN_ID, ChainId } from './config';
import relativeTime from 'dayjs/plugin/relativeTime';
import { AvatarProvider } from '@davatar/react';
import dayjs from 'dayjs';
import DelegatePage from './pages/DelegatePage';
import { useWallet } from './hooks/useWallet';
import { usePublicProvider } from './hooks/usePublicProvider';
import { WalletContext } from './contexts/WalletContext';

function App() {
  const wallet = useWallet();
  const dispatch = useAppDispatch();
  const publicProvider = usePublicProvider();
  dayjs.extend(relativeTime);

  useEffect(() => {
    // Local account array updated
    dispatch(setActiveAccount(wallet.account));
  }, [wallet.account, dispatch]);

  const alertModal = useAppSelector(state => state.application.alertModal);

  return (
    <WalletContext.Provider value={wallet}>
      <div className={`${classes.wrapper}`}>
        {Number(CHAIN_ID) !== wallet.chainId && <NetworkAlert />}
        {alertModal.show && (
          <AlertModal
            title={alertModal.title}
            content={<p>{alertModal.message}</p>}
            onDismiss={() => dispatch(setAlertModal({ ...alertModal, show: false }))}
          />
        )}
        <BrowserRouter>
          <AvatarProvider
            provider={wallet.chainId === ChainId.Mainnet ? publicProvider : undefined}
            batchLookups={true}
          >
            <NavBar />
            <Switch>
              <Route exact path="/" component={AuctionPage} />
              <Redirect from="/auction/:id" to="/alp/:id" />
              <Route
                exact
                path="/alp/:id"
                render={props => <AuctionPage initialAuctionId={Number(props.match.params.id)} />}
              />
              <Route exact path="/alpers" component={AlpersPage} />
              <Route exact path="/create-proposal" component={CreateProposalPage} />
              <Route exact path="/vote" component={GovernancePage} />
              <Route exact path="/vote/:id" component={VotePage} />
              <Route exact path="/playground" component={Playground} />
              <Route exact path="/delegate" component={DelegatePage} />
              <Route component={NotFoundPage} />
            </Switch>
            <Footer />
          </AvatarProvider>
        </BrowserRouter>
      </div>
    </WalletContext.Provider>
  );
}

export default App;
