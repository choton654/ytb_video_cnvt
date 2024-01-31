import { Container, Box, Input, Button } from "@chakra-ui/react";

export default function Home() {
  return (
    <Container h={'100vh'} display={'flex'} flexDirection={'column'} justifyContent={'center'} alignItems={'center'} gridGap={'60px'}>
      <Box fontSize={'30px'} textAlign={'center'}>YouTube Video to Text and Summery</Box>
      <Input focusBorderColor="black" variant='flushed' size={'lg'} placeholder='Provide your YouTube Video Link here' />
      <Button size={'sm'} w={'190px'} fontWeight={'400'} colorScheme={'black'} bg={'black'}>START NOW</Button>
    </Container>
  );
}
