"use client";

import { useEffect, useState } from "react";
import withAuth from "../../components/withAuth";
import axios from "axios";
import { baseUrl } from "../../utils/baseUrl";
import { Box, Button, Container, HStack, Spinner, Stack } from "@chakra-ui/react";
import Audiocard from "../../components/Audiocard";

function Dashboard({ token }) {
  const [ranscript, setTranscript] = useState([]);
  const [isLoading, setisLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setisLoading(true);
        const { data } = await axios.get(`${baseUrl}/api/user/getAudioTranscript`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("---getAudioTranscript---", data);
        setTranscript(data?.data);
        setisLoading(false);
      } catch (error) {
        console.error(error);
        setisLoading(false);
      }
    })();
  }, [token]);

  return (
    <Container my={'1rem'} overflow={"auto"} display={"flex"} flexDirection={"column"} justifyContent={"center"} alignItems={"center"}>
      <HStack w={"100%"} justifyContent={'center'} mb={"20px"} alignItems={'center'} flexWrap={'wrap'}>
        <Box flex={1} fontSize={"20px"} textAlign={"center"} >
          Video titles
        </Box>
        <Button size={"sm"}  fontWeight={"400"} colorScheme={"black"} bg={"black"} onClick={() => window.location.assign('/')}>
          ADD LINK
        </Button>
      </HStack>
      {isLoading ? (
        <Spinner />
      ) : (
        <Stack spacing={"10px"}>{ranscript?.length > 0 && ranscript.map((rt, i) => <Audiocard key={i} data={rt} token={token} />)}</Stack>
      )}
    </Container>
  );
}

export default withAuth(Dashboard);
