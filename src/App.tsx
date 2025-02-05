import { Flex, HStack, Theme } from '@chakra-ui/react';
import HeaderController from './HeaderController';
import SequentialEditor from './SequentialEditor';
import { Toaster } from './components/ui/toaster';
import AudioSystem from './AudioSystem';

function App() {
  return (<>
    <Theme appearance='dark'>
      <Toaster />
      <AudioSystem />
      <Flex h={"100vh"} w={"100vw"} direction={"column"} >
        <HStack w={"100vw"}>
          <HeaderController />
        </HStack>
        <SequentialEditor />
      </Flex>
    </Theme>
  </>);
}

export default App;
